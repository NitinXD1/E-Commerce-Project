
import express from "express"
import dotenv from "dotenv"
import { connectDB } from "./lib/db.js"
import cookieParser from "cookie-parser"

import authRoutes from "./routes/auth.route.js"
import productRoutes from './routes/product.route.js'
import cartRoutes from './routes/cart.route.js'
import couponRoutes from './routes/coupon.route.js'
import paymentRoutes from './routes/payment.route.js'
import analyticsRoutes from './routes/analytics.route.js'

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

//authentication
app.use("/api/auth",authRoutes)
app.use("/api/products",productRoutes)
app.use("/api/cart",cartRoutes)
app.use("/api/coupon",couponRoutes)
app.use("/api/payment",paymentRoutes)
app.use("/api/analytics",analyticsRoutes)

app.listen(PORT, () => {
    console.log("server is listening on http://localhost:" + PORT)

    connectDB()
})