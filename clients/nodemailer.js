import nodemailer from "nodemailer"
import "dotenv/config"

export let mail_client = nodemailer.createTransport({
    //@ts-ignore
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth:{
        user:process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    }
})