const Router = require('express')
const router = new Router()
const UserRouter = require('./UserRouter')

router.use('/user', UserRouter)


module.exports = router