const Router = require('express')
const router = Router()
const userController = require('../controllers/userController')  // импорт с маленькой буквы
const authMiddleware = require('../middleware/authMiddleware')

// Используем userController вместо UserController
router.post('/registration', userController.registration.bind(userController))
router.post('/login', userController.login.bind(userController))
router.get('/auth', authMiddleware, userController.check)
router.post('/logout', authMiddleware, userController.logout)
router.post('/registration', userController.registration.bind(userController));
router.post('/verify-email', userController.verifyEmail.bind(userController));
router.post('/resend-verification', userController.resendVerificationEmail.bind(userController));
module.exports = router