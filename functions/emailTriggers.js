const { onDocumentCreated } = require("firebase-functions/v2/firestore")
const { HttpsError, onCall } = require("firebase-functions/v2/https")
const logger = require("firebase-functions/logger")
const admin = require("firebase-admin")
const { Resend } = require("resend")

if (!admin.apps.length) {
  admin.initializeApp()
}

const CUSTOM_DESIGN_RECIPIENT_EMAIL = "upgrade@whidbey.com"
const DIRECT_MESSAGE_RECIPIENT_EMAIL = "upgrade@whidbey.com"
const PRODUCT_INQUIRY_RECIPIENT_EMAIL = "upgrade@whidbey.com"
const PUBLIC_SITE_ORIGIN = "https://upgradeaprons.web.app"
const MAX_SVG_MARKUP_LENGTH = 350000
const MAX_DESIGN_IMAGE_DATA_URL_LENGTH = 850000
const MAX_PRODUCT_IMAGE_ATTACHMENT_BYTES = 5000000
const DESIGN_IMAGE_DATA_URL_PATTERN =
  /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/

function safe(value) {
  return String(value ?? "").trim()
}

function isLocalPreviewHost(hostname) {
  const host = safe(hostname).toLowerCase()

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]"
  )
}

function normalizePublicSiteUrl(value) {
  const raw = safe(value)

  if (!raw) {
    return ""
  }

  try {
    const url = new URL(raw, PUBLIC_SITE_ORIGIN)

    if (!["http:", "https:"].includes(url.protocol)) {
      return ""
    }

    if (isLocalPreviewHost(url.hostname)) {
      return new URL(
        `${url.pathname}${url.search}${url.hash}`,
        PUBLIC_SITE_ORIGIN,
      ).toString()
    }

    return url.toString()
  } catch {
    return ""
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatInches(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return ""
  }

  return `${number.toFixed(2).replace(/\.?0+$/, "")} in`
}

function yesNo(value) {
  return value ? "Yes" : "No"
}

function getPreferredContact(email, phone, preferredContact) {
  const hasEmail = Boolean(safe(email))
  const hasPhone = Boolean(safe(phone))

  if (hasEmail && !hasPhone) {
    return "Email"
  }

  if (hasPhone && !hasEmail) {
    return "Phone"
  }

  return safe(preferredContact) === "Phone" ? "Phone" : "Email"
}

function getEmailSettings() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from:
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      "Upgrade Aprons <onboarding@resend.dev>",
  }
}

function getResendEmailId(result) {
  if (result?.error) {
    const message =
      result.error.message ||
      result.error.name ||
      "Resend returned an email delivery error."
    throw new Error(message)
  }

  const emailId = safe(result?.data?.id || result?.id)

  if (!emailId) {
    throw new Error("Resend did not return an email id.")
  }

  return emailId
}

function getDesign(data) {
  const design = data.design && typeof data.design === "object" ? data.design : {}
  const apron = design.apron && typeof design.apron === "object" ? design.apron : {}
  const pockets = Array.isArray(design.pockets) ? design.pockets : []

  return { apron, pockets }
}

function isUploadedImageSubmission(data) {
  return (
    safe(data.submissionMode) === "uploaded-image" ||
    safe(data.designImage?.sourceField) === "uploadedDesignImage.dataUrl"
  )
}

function getImageAttachmentFilename(filename, mimeType) {
  const extension =
    mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png"
  const fallback = `custom-apron-design.${extension}`
  const cleaned = safe(filename)
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 90)

  if (!cleaned) {
    return fallback
  }

  return /\.(png|jpe?g|webp)$/i.test(cleaned) ? cleaned : fallback
}

function getDesignImage(data) {
  const designImage =
    data.designImage && typeof data.designImage === "object" ? data.designImage : {}
  const dataUrl = safe(designImage.dataUrl)
  const imageMatch =
    dataUrl.length <= MAX_DESIGN_IMAGE_DATA_URL_LENGTH
      ? dataUrl.match(DESIGN_IMAGE_DATA_URL_PATTERN)
      : null

  if (imageMatch) {
    const mimeType = imageMatch[1]

    return {
      filename: getImageAttachmentFilename(designImage.filename, mimeType),
      mimeType,
      sourceField: safe(designImage.sourceField) || "designImage.dataUrl",
      dataUrl,
      fallbackFilename: "custom-apron-design.svg",
    }
  }

  return {
    filename: safe(designImage.filename) || "custom-apron-design.svg",
    mimeType: safe(designImage.mimeType) || "image/svg+xml",
    sourceField: safe(designImage.sourceField) || "svgMarkup",
  }
}

function getDesignAttachment(data) {
  const designImage = getDesignImage(data)
  const dataUrl = safe(designImage.dataUrl)
  const imageMatch = dataUrl.match(DESIGN_IMAGE_DATA_URL_PATTERN)

  if (imageMatch) {
    return {
      filename: designImage.filename,
      content: imageMatch[2],
    }
  }

  const svgMarkup = safe(data.svgMarkup)

  if (!svgMarkup) {
    return null
  }

  return {
    filename: "custom-apron-design.svg",
    content: Buffer.from(svgMarkup, "utf8").toString("base64"),
  }
}

function getStoredDesignImage(designImage) {
  if (!designImage || typeof designImage !== "object") {
    return designImage
  }

  const storedDesignImage = { ...designImage }
  delete storedDesignImage.dataUrl

  return storedDesignImage
}

function buildTextEmail(data) {
  const { apron, pockets } = getDesign(data)
  const uploadedImageSubmission = isUploadedImageSubmission(data)
  const lines = [
    "New Custom Apron Design",
    "",
    "Contact",
    `Name: ${safe(data.name)}`,
    `Email: ${safe(data.email)}`,
    `Phone: ${safe(data.phone)}`,
    `Preferred Contact: ${safe(data.preferredContact)}`,
    `Wearer Height: ${safe(data.wearerHeight)}`,
    `Submission Type: ${
      uploadedImageSubmission ? "Uploaded image" : "Design tool mockup"
    }`,
    "",
    "Apron",
    uploadedImageSubmission ? "Base: See uploaded image." : `Base: ${safe(apron.name)}`,
    uploadedImageSubmission
      ? ""
      : `Body Color: ${safe(apron.colorName || apron.color)}`,
    uploadedImageSubmission
      ? ""
      : `Size: ${formatInches(apron.totalWidth)} wide x ${formatInches(apron.totalHeight)} tall`,
    !uploadedImageSubmission && apron.bibWidth
      ? `Bib Width: ${formatInches(apron.bibWidth)}`
      : "",
    "",
    "Pockets",
  ].filter(Boolean)

  if (!pockets.length) {
    lines.push(uploadedImageSubmission ? "See uploaded image." : "No pockets selected.")
  } else {
    for (const pocket of pockets) {
      lines.push(
        [
          `${Number(pocket.number || 0)}. ${safe(pocket.name)}`,
          safe(pocket.layerName || (pocket.layer ? `Layer ${pocket.layer}` : "")),
          `${formatInches(pocket.width)} wide x ${formatInches(pocket.height)} tall`,
          `x ${formatInches(pocket.x)}, y ${formatInches(pocket.y)}`,
          safe(pocket.colorName || pocket.color),
          `vertical stitch: ${yesNo(pocket.verticalStitch)}`,
        ].join(" | "),
      )
    }
  }

  lines.push("")
  lines.push("Intended Use")
  lines.push(safe(data.useCase))
  lines.push("")
  lines.push("Notes")
  lines.push(safe(data.notes))

  return lines.join("\n")
}

function buildHtmlEmail(data) {
  const { apron, pockets } = getDesign(data)
  const uploadedImageSubmission = isUploadedImageSubmission(data)

  const pocketRows = pockets.length
    ? pockets
        .map(
          (pocket) => `
            <tr>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e8ddce;">${escapeHtml(pocket.number)}. ${escapeHtml(pocket.name)}</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e8ddce;">${escapeHtml(pocket.layerName || (pocket.layer ? `Layer ${pocket.layer}` : ""))}</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e8ddce;">${escapeHtml(formatInches(pocket.width))} x ${escapeHtml(formatInches(pocket.height))}</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e8ddce;">X ${escapeHtml(formatInches(pocket.x))}, Y ${escapeHtml(formatInches(pocket.y))}</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e8ddce;">${escapeHtml(pocket.colorName || pocket.color)}</td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e8ddce;">${yesNo(pocket.verticalStitch)}</td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td colspan="6" style="padding: 10px 8px;">${uploadedImageSubmission ? "See uploaded image." : "No pockets selected."}</td>
      </tr>
    `

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #2a2119; line-height: 1.65;">
      <h2 style="margin: 0 0 16px; color: #2a2119;">New Custom Apron Design</h2>
      <p style="margin: 0 0 20px;">The attached image contains the customer's ${uploadedImageSubmission ? "uploaded design image" : "design-board layout"}.</p>

      <table style="width: 100%; max-width: 760px; border-collapse: collapse;">
        <tr><td style="padding: 7px 0; font-weight: bold;">Name</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Email</td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Phone</td><td>${escapeHtml(data.phone)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Preferred Contact</td><td>${escapeHtml(data.preferredContact)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Wearer Height</td><td>${escapeHtml(data.wearerHeight)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Submission Type</td><td>${uploadedImageSubmission ? "Uploaded image" : "Design tool mockup"}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Source</td><td>${escapeHtml(data.source)}</td></tr>
      </table>

      <div style="margin-top: 24px; padding: 16px; background: #f8f0e4; border-left: 4px solid #c7802e;">
        <div><strong>Apron:</strong> ${uploadedImageSubmission ? "See uploaded image." : escapeHtml(apron.name)}</div>
        ${
          uploadedImageSubmission
            ? ""
            : `<div><strong>Body Color:</strong> ${escapeHtml(apron.colorName || apron.color)}</div>
        <div><strong>Size:</strong> ${escapeHtml(formatInches(apron.totalWidth))} wide x ${escapeHtml(formatInches(apron.totalHeight))} tall</div>`
        }
        ${
          !uploadedImageSubmission && apron.bibWidth
            ? `<div><strong>Bib Width:</strong> ${escapeHtml(formatInches(apron.bibWidth))}</div>`
            : ""
        }
      </div>

      <h3 style="margin: 28px 0 10px; color: #2a2119;">Pocket Layout</h3>
      <table style="width: 100%; max-width: 900px; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 10px 8px; border-bottom: 2px solid #2a2119;">Pocket</th>
            <th style="text-align: left; padding: 10px 8px; border-bottom: 2px solid #2a2119;">Layer</th>
            <th style="text-align: left; padding: 10px 8px; border-bottom: 2px solid #2a2119;">Size</th>
            <th style="text-align: left; padding: 10px 8px; border-bottom: 2px solid #2a2119;">Placement</th>
            <th style="text-align: left; padding: 10px 8px; border-bottom: 2px solid #2a2119;">Color</th>
            <th style="text-align: left; padding: 10px 8px; border-bottom: 2px solid #2a2119;">Center Stitch</th>
          </tr>
        </thead>
        <tbody>${pocketRows}</tbody>
      </table>

      <div style="margin-top: 24px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Intended Use</div>
        <div style="padding: 14px; background: #f8f0e4; white-space: pre-wrap;">${escapeHtml(data.useCase)}</div>
      </div>

      <div style="margin-top: 18px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Notes</div>
        <div style="padding: 14px; background: #f8f0e4; white-space: pre-wrap;">${escapeHtml(data.notes)}</div>
      </div>
    </div>
  `
}

function buildDirectMessageTextEmail(data) {
  return [
    "New Direct Message",
    "",
    "Contact",
    `Name: ${safe(data.name)}`,
    `Email: ${safe(data.email)}`,
    `Phone: ${safe(data.phone)}`,
    `Preferred Reply: ${safe(data.preferredContact)}`,
    "",
    "Message",
    safe(data.message),
  ].join("\n")
}

function buildDirectMessageHtmlEmail(data) {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #2a2119; line-height: 1.65;">
      <h2 style="margin: 0 0 16px; color: #2a2119;">New Direct Message</h2>

      <table style="width: 100%; max-width: 760px; border-collapse: collapse;">
        <tr><td style="padding: 7px 0; font-weight: bold;">Name</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Email</td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Phone</td><td>${escapeHtml(data.phone)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Preferred Reply</td><td>${escapeHtml(data.preferredContact)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Source</td><td>${escapeHtml(data.source)}</td></tr>
      </table>

      <div style="margin-top: 24px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Message</div>
        <div style="padding: 14px; background: #f8f0e4; white-space: pre-wrap;">${escapeHtml(data.message)}</div>
      </div>
    </div>
  `
}

function getProductInquiryProduct(data) {
  const product = data.product && typeof data.product === "object" ? data.product : {}
  const image = safe(product.image || data.productImage)

  return {
    title: safe(product.title || data.productTitle),
    slug: safe(product.slug || data.productSlug),
    category: safe(product.category || data.productCategory),
    image,
    imageUrl: normalizePublicSiteUrl(
      product.imageUrl || data.productImageUrl || image,
    ),
    pageUrl: normalizePublicSiteUrl(product.pageUrl || data.productPageUrl),
  }
}

function getProductImageAttachmentFilename(product, mimeType) {
  const extension =
    mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png"
  const base =
    safe(product.slug || product.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "product-image"

  return `${base}.${extension}`
}

async function getProductImageAttachment(product) {
  const imageUrl = safe(product.imageUrl)

  if (!/^https?:\/\//i.test(imageUrl)) {
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(imageUrl, { signal: controller.signal })

    if (!response.ok) {
      return null
    }

    const mimeType = safe(response.headers.get("content-type")).split(";")[0]

    if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
      return null
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer())

    if (imageBuffer.byteLength > MAX_PRODUCT_IMAGE_ATTACHMENT_BYTES) {
      logger.warn("Product inquiry image attachment skipped; image is too large.", {
        imageUrl,
        bytes: imageBuffer.byteLength,
      })
      return null
    }

    return {
      filename: getProductImageAttachmentFilename(product, mimeType),
      content: imageBuffer.toString("base64"),
      contentType: mimeType,
      contentId: "product-image",
    }
  } catch (error) {
    logger.warn("Product inquiry image attachment could not be fetched.", {
      imageUrl,
      message: safe(error?.message),
    })
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

function getProductInquiry(rawData) {
  const data = rawData && typeof rawData === "object" ? rawData : {}
  const name = safe(data.name)
  const email = safe(data.email).toLowerCase()
  const phone = safe(data.phone)
  const preferredContact = getPreferredContact(email, phone, data.preferredContact)
  const shippingAddress = safe(data.shippingAddress)
  const message = safe(data.message)
  const product = getProductInquiryProduct(data)

  if (!email && !phone) {
    throw new HttpsError(
      "invalid-argument",
      "Either email or phone is required.",
    )
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.")
  }

  if (!message) {
    throw new HttpsError("invalid-argument", "A message is required.")
  }

  if (!product.title) {
    throw new HttpsError("invalid-argument", "A product name is required.")
  }

  return {
    name,
    email,
    phone,
    preferredContact,
    shippingAddress,
    message,
    product,
    source: safe(data.source) || "product-detail-page",
  }
}

function buildProductInquiryTextEmail(data) {
  const product = getProductInquiryProduct(data)

  return [
    "New Product Inquiry",
    "",
    "Product",
    `Name: ${product.title}`,
    product.category ? `Category: ${product.category}` : "",
    product.pageUrl ? `Product Page: ${product.pageUrl}` : "",
    product.imageUrl ? `Product Image: ${product.imageUrl}` : "",
    "",
    "Contact",
    `Name: ${safe(data.name)}`,
    `Email: ${safe(data.email)}`,
    `Phone: ${safe(data.phone)}`,
    `Preferred Reply: ${safe(data.preferredContact)}`,
    "",
    "Shipping Address",
    safe(data.shippingAddress),
    "",
    "Message",
    safe(data.message),
  ]
    .filter((line) => line !== "")
    .join("\n")
}

function buildProductInquiryHtmlEmail(data, imageContentId = "") {
  const product = getProductInquiryProduct(data)
  const imageUrl = safe(product.imageUrl)
  const imageSrc = safe(imageContentId) ? `cid:${safe(imageContentId)}` : imageUrl

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #2a2119; line-height: 1.65;">
      <h2 style="margin: 0 0 16px; color: #2a2119;">New Product Inquiry</h2>

      <div style="margin: 0 0 24px; padding: 16px; background: #f8f0e4; border-left: 4px solid #c7802e;">
        <div><strong>Product:</strong> ${escapeHtml(product.title)}</div>
        ${
          product.category
            ? `<div><strong>Category:</strong> ${escapeHtml(product.category)}</div>`
            : ""
        }
        ${
          product.pageUrl
            ? `<div><strong>Product Page:</strong> <a href="${escapeHtml(product.pageUrl)}">${escapeHtml(product.pageUrl)}</a></div>`
            : ""
        }
      </div>

      ${
        imageUrl
          ? `<div style="margin: 0 0 24px;">
              <div style="font-weight: bold; margin-bottom: 8px;">Product Image</div>
              <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.title)}" style="display: block; width: 100%; max-width: 420px; height: auto; border: 1px solid #e8ddce; background: #120c08;" />
              <div style="margin-top: 8px;"><a href="${escapeHtml(imageUrl)}">${escapeHtml(imageUrl)}</a></div>
            </div>`
          : ""
      }

      <table style="width: 100%; max-width: 760px; border-collapse: collapse;">
        <tr><td style="padding: 7px 0; font-weight: bold;">Name</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Email</td><td>${escapeHtml(data.email)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Phone</td><td>${escapeHtml(data.phone)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Preferred Reply</td><td>${escapeHtml(data.preferredContact)}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold;">Source</td><td>${escapeHtml(data.source)}</td></tr>
      </table>

      <div style="margin-top: 24px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Shipping Address</div>
        <div style="padding: 14px; background: #f8f0e4; white-space: pre-wrap;">${escapeHtml(data.shippingAddress)}</div>
      </div>

      <div style="margin-top: 18px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Message</div>
        <div style="padding: 14px; background: #f8f0e4; white-space: pre-wrap;">${escapeHtml(data.message)}</div>
      </div>
    </div>
  `
}

async function deliverProductInquiryEmail(data, settings) {
  const resend = new Resend(settings.apiKey)
  const product = getProductInquiryProduct(data)
  const attachment = await getProductImageAttachment(product)
  const subject = `Product Inquiry - ${safe(product.title) || "Apron"}`
  const email = {
    from: settings.from,
    to: [PRODUCT_INQUIRY_RECIPIENT_EMAIL],
    replyTo: safe(data.email) || undefined,
    subject,
    text: buildProductInquiryTextEmail(data),
    html: buildProductInquiryHtmlEmail(data, attachment?.contentId),
  }

  if (attachment) {
    email.attachments = [attachment]
  }

  const result = await resend.emails.send(email)

  return getResendEmailId(result)
}

async function deliverCustomApronDesignEmail(data, settings) {
  const resend = new Resend(settings.apiKey)
  const attachment = getDesignAttachment(data)
  const subject = `New Custom Apron Design - ${safe(data.name) || "Unnamed"}`
  const email = {
    from: settings.from,
    to: [CUSTOM_DESIGN_RECIPIENT_EMAIL],
    replyTo: safe(data.email) || undefined,
    subject,
    text: buildTextEmail(data),
    html: buildHtmlEmail(data),
  }

  if (attachment) {
    email.attachments = [attachment]
  }

  const result = await resend.emails.send(email)

  return getResendEmailId(result)
}

async function sendCustomApronDesignEmail(event) {
  const snap = event.data

  if (!snap) {
    return
  }

  const data = snap.data() || {}
  const docRef = snap.ref

  if (data.emailStatus === "sent") {
    return
  }

  const settings = getEmailSettings()

  if (!settings.apiKey) {
    logger.warn("RESEND_API_KEY is not configured; custom apron email skipped.")
    await docRef.set(
      {
        emailStatus: "missing_resend_api_key",
        emailFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return
  }

  try {
    const emailId = await deliverCustomApronDesignEmail(data, settings)

    await docRef.set(
      {
        emailStatus: "sent",
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailId,
      },
      { merge: true },
    )
  } catch (error) {
    logger.error("Failed to send custom apron design email", error)

    await docRef.set(
      {
        emailStatus: "failed",
        emailError: safe(error?.message),
        emailFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    throw error
  }
}

function getCustomApronSubmission(rawData) {
  const data = rawData && typeof rawData === "object" ? rawData : {}
  const name = safe(data.name)
  const email = safe(data.email).toLowerCase()
  const phone = safe(data.phone)
  const preferredContact = getPreferredContact(email, phone, data.preferredContact)
  const useCase = safe(data.useCase)
  const svgMarkup = safe(data.svgMarkup)
  const designImage = getDesignImage(data)
  const hasDesignImageDataUrl = Boolean(safe(designImage.dataUrl))

  if (!name || (!email && !phone)) {
    throw new HttpsError(
      "invalid-argument",
      "Name and either email or phone are required.",
    )
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.")
  }

  if (!svgMarkup && !hasDesignImageDataUrl) {
    throw new HttpsError("invalid-argument", "A design image is required.")
  }

  if (svgMarkup.length > MAX_SVG_MARKUP_LENGTH) {
    throw new HttpsError("invalid-argument", "The design image is too large.")
  }

  return {
    name,
    email,
    phone,
    preferredContact,
    wearerHeight: safe(data.wearerHeight),
    wearerHeightFeet: safe(data.wearerHeightFeet),
    wearerHeightInches: safe(data.wearerHeightInches),
    useCase,
    notes: safe(data.notes),
    submissionMode:
      safe(data.submissionMode) === "uploaded-image"
        ? "uploaded-image"
        : "design-tool",
    design: data.design && typeof data.design === "object" ? data.design : {},
    designImage,
    svgMarkup,
    pocketCount: Number.isFinite(Number(data.pocketCount))
      ? Number(data.pocketCount)
      : 0,
    source: "custom-apron-designer",
  }
}

async function submitCustomApronDesign(request) {
  const submission = getCustomApronSubmission(request.data)
  const settings = getEmailSettings()

  if (!settings.apiKey) {
    logger.error("RESEND_API_KEY is not configured; custom apron callable failed.")
    throw new HttpsError(
      "failed-precondition",
      "The email service is not configured.",
    )
  }

  try {
    const emailId = await deliverCustomApronDesignEmail(submission, settings)
    const docRef = await admin.firestore().collection("customApronDesigns").add({
      ...submission,
      designImage: getStoredDesignImage(submission.designImage),
      emailStatus: "sent",
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      emailId,
      submittedBy: "callable-function",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { ok: true, id: docRef.id, emailId }
  } catch (error) {
    logger.error("Failed to submit custom apron design from callable", error)
    throw new HttpsError(
      "internal",
      "The custom design email could not be sent.",
    )
  }
}

async function submitProductInquiry(request) {
  const submission = getProductInquiry(request.data)
  const settings = getEmailSettings()

  if (!settings.apiKey) {
    logger.error("RESEND_API_KEY is not configured; product inquiry callable failed.")
    throw new HttpsError(
      "failed-precondition",
      "The email service is not configured.",
    )
  }

  try {
    const emailId = await deliverProductInquiryEmail(submission, settings)
    const docRef = await admin.firestore().collection("productInquiries").add({
      ...submission,
      emailStatus: "sent",
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      emailId,
      submittedBy: "callable-function",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { ok: true, id: docRef.id, emailId }
  } catch (error) {
    logger.error("Failed to submit product inquiry from callable", error)
    throw new HttpsError(
      "internal",
      "The product inquiry email could not be sent.",
    )
  }
}

async function sendProductInquiryEmail(event) {
  const snap = event.data

  if (!snap) {
    return
  }

  const data = snap.data() || {}
  const docRef = snap.ref

  if (data.emailStatus === "sent") {
    return
  }

  const settings = getEmailSettings()

  if (!settings.apiKey) {
    logger.warn("RESEND_API_KEY is not configured; product inquiry email skipped.")
    await docRef.set(
      {
        emailStatus: "missing_resend_api_key",
        emailFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return
  }

  try {
    const emailId = await deliverProductInquiryEmail(data, settings)

    await docRef.set(
      {
        emailStatus: "sent",
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailId,
      },
      { merge: true },
    )
  } catch (error) {
    logger.error("Failed to send product inquiry email", error)

    await docRef.set(
      {
        emailStatus: "failed",
        emailError: safe(error?.message),
        emailFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    throw error
  }
}

async function sendDirectMessageEmail(event) {
  const snap = event.data

  if (!snap) {
    return
  }

  const data = snap.data() || {}
  const docRef = snap.ref

  if (data.emailStatus === "sent") {
    return
  }

  const settings = getEmailSettings()

  if (!settings.apiKey) {
    logger.warn("RESEND_API_KEY is not configured; direct message email skipped.")
    await docRef.set(
      {
        emailStatus: "missing_resend_api_key",
        emailFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return
  }

  const resend = new Resend(settings.apiKey)
  const subject = `New Direct Message - ${safe(data.name) || "Unnamed"}`

  try {
    const result = await resend.emails.send({
      from: settings.from,
      to: [DIRECT_MESSAGE_RECIPIENT_EMAIL],
      replyTo: safe(data.email) || undefined,
      subject,
      text: buildDirectMessageTextEmail(data),
      html: buildDirectMessageHtmlEmail(data),
    })

    const emailId = getResendEmailId(result)

    await docRef.set(
      {
        emailStatus: "sent",
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailId,
      },
      { merge: true },
    )
  } catch (error) {
    logger.error("Failed to send direct message email", error)

    await docRef.set(
      {
        emailStatus: "failed",
        emailError: safe(error?.message),
        emailFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    throw error
  }
}

module.exports = {
  submitCustomApronDesign: onCall(
    {
      region: "us-central1",
      maxInstances: 10,
    },
    submitCustomApronDesign,
  ),
  submitProductInquiry: onCall(
    {
      region: "us-central1",
      maxInstances: 10,
    },
    submitProductInquiry,
  ),
  sendCustomApronDesignEmail: onDocumentCreated(
    {
      document: "customApronDesigns/{docId}",
      region: "us-central1",
    },
    sendCustomApronDesignEmail,
  ),
  sendProductInquiryEmail: onDocumentCreated(
    {
      document: "productInquiries/{docId}",
      region: "us-central1",
    },
    sendProductInquiryEmail,
  ),
  sendDirectMessageEmail: onDocumentCreated(
    {
      document: "directMessages/{docId}",
      region: "us-central1",
    },
    sendDirectMessageEmail,
  ),
}
