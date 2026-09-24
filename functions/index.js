const { setGlobalOptions } = require("firebase-functions/v2")

setGlobalOptions({ maxInstances: 10 })

module.exports = {
  ...require("./emailTriggers"),
}
