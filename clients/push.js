import 'dotenv/config'
import axios from "axios";

export const pushSMS = async (text, destination) => {
    const sms_config = {
        accountid: process.env.PUSH_ID,
        password: process.env.PUSH_PASSWORD,
        sender: "ESP Auth",
        text: text,
        to: destination
    }
    await axios.post(process.env.PUSH_URL, sms_config, {
        headers: {
            "Content-Type": "application/json"
        }
    })
}