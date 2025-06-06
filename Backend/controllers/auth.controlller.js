import { User } from "../models/user.model.js";
import { redis } from "../lib/redis.js";
import jwt from 'jsonwebtoken'

const generateTokens = async (userId) => {

    try {
        
        const user = await User.findById(userId)
    
        if(!user){
            throw new Error("User doesnt exists")
        }
    
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
    
        return {accessToken,refreshToken}

    } catch (error) {
        console.log(error.message)
    }
}

const storeRefreshToken = async (userId,refreshToken) => {
    await redis.set(`refreshToken:${userId}`,refreshToken,"EX",7*24*60*60)
}

const setCookies = (res,accessToken,refreshToken) => {


    res.cookie("accessToken",accessToken,{
        httpOnly : true,
        secure : process.env.NODE_ENV === "production",
        sameSite : "strict",
        maxAge : 15 * 60 * 1000 
    })

    res.cookie("refreshToken",refreshToken,{
        httpOnly : true,
        secure : process.env.NODE_ENV === "production",
        sameSite : "strict",
        maxAge : 7 * 24 * 60 * 60 * 1000 
    })
}

export const signup = async (req,res) =>{
    const {name , email , password} = req.body;
    try {
    
        const userExists = await User.findOne({email})
    
        if(userExists){
            return res.status(400).json(
                {
                    message : "User Already Exists"
                }
            )
        }
    
        const user = await User.create({
            name,
            password,
            email,
        })

        //generating jwt

        const {accessToken , refreshToken} = await generateTokens(user._id)
        await storeRefreshToken(user._id,refreshToken)

        setCookies(res,accessToken,refreshToken)
    
        res.status(201).json(
            {
                user : {
                    user : user._id,
                    name : user.name,
                    email : user.email,
                    role : user.role
                },
                message : "User created Successfully"
            }
        )
    } catch (error) {
        return res.status(401).json({
            message : error.message
        })
    }
}

export const login = async (req,res) =>{
    try {
        const {password,email} = req.body
    
        if(!email){
            throw new Error("Email is necessary")
        }
    
        const user = await User.findOne({email})
    
        if(user && await user.comparePassword(password)){
            const {accessToken , refreshToken} = await generateTokens(user._id)
            
            await storeRefreshToken(user._id,refreshToken)

            setCookies(res,accessToken,refreshToken)
            
            res.status(201).json({
                user : {
                    _id : user._id,
                    email : user.email,
                    username : user.username,
                    role : user.role,
                },
                message : "User logged in Successfully"
            })
        }
        else{
            res.status(403).json(
                {
                    message : "Incorrect password or email , Please Try Again"
                }
            )
        }

    } catch (error) {
        console.log("Error in login controller")
        res.status(500).json({message : error.message})
    }
}

export const logout = async (req,res) =>{
    try{
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: "You're not logged in or refresh token missing"
            });
        }

        const decodedToken = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)

        await redis.del(`refreshToken:${decodedToken.id}`)

        res.status(200)
        .clearCookie("refreshToken")
        .clearCookie("accessToken")
        .json({
            message : "User logged out successfully"
        })
    }
    catch(err){
        console.log("Error in Logout controller")
        res.status(500).json(
            {
                message : "Server Error", error : err.message
            }
        )
    }
}

//refreshing the access token after each expiration
export const refreshToken = async (req,res) => {
    try {
        
        const refreshToken = req.cookies.refreshToken

        if(!refreshToken){
            return res.status(401).json({message : "No refresh token found"})
        }

        const decodedRefreshToken = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)
        
        const storeToken = await redis.get(`refreshToken:${decodedRefreshToken.id}`)

        if(refreshToken !== storeToken){
            return res.status(401).json({
                message : "Invalid refresh Token"
            })
        }
        
        const {accessToken} = await generateTokens(decodedRefreshToken.id)

        res.cookie("accessToken",accessToken,{
            httpOnly : true,
            secure : process.env.NODE_ENV === "production",
            sameSite : "strict",
            maxAge : 15 * 60 * 1000,
        })

        return res.status(200).json({ message: "Access token refreshed" });
        
    } catch (error) {
        console.log("Access token controlled error",error.message)
        return res.status(400).json({message : "Error while refreshing the access token"})
    }
}

export const getProfile = async (req,res) => {
    const user = req.user

    return res.json(user)
}