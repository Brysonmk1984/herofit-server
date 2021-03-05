const { body, validationResult } = require('express-validator');

const avatarGenerateFoeValidation = () => {
  return [
    body('avatar.health').isNumeric(),
    body('avatar.power').isNumeric(),
    body('avatar.armor').isString(),
    body('avatar.fire').isString(),
    body('avatar.earth').isString(),
    body('avatar.water').isString(),
    body('avatar.air').isString(),
  ]
}

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }
  const extractedErrors = []
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }))

  return res.status(422).json({
    errors: extractedErrors,
  })
}

module.exports = {
  avatarGenerateFoeValidation,
  validate,
}