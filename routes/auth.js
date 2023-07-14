import express from "express"
import {prisma} from "../app.js";
import bcrypt from "bcryptjs"
import jsonwebtoken from "jsonwebtoken"
import "dotenv/config"
import randomInteger from 'random-int';
import {pushSMS} from "../clients/push.js"
import {mail_client} from "../clients/nodemailer.js"
import {phone} from "phone";
import ent from "ent"
export const router = express.Router();

router.post("/signin-login", async (req, res)=>{
    try{
        const {username, password} = req.body

        if(!username || !password) { res.status(400).json({message: "Les données sont invalides"}); return; }
        if(!passwordChecker(password, req, res)) return;
        if(!usernameChecker(username, req, res)) return;

        const user = await prisma.user.findUnique({ where: {username: username} })
        if(!user) { res.status(404).json({message: "L'utilisateur n'existe pas !"}); return;}
        if(!bcrypt.compareSync(password, user.password)) { res.status(401).json({ message: "Mot de passe incorrect."}); return; }
        const access_token  = jsonwebtoken.sign({id: user.id}, process.env.JWT_KEY)
        delete user.password
        res.status(200).json({ user, access_token})
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
})

export const passwordChecker = (password, req, res) => {
    const regexPassword = /(?=.*[a-z])(?=.*[0-9])(?=.*[^a-z0-9])(?=.{8,30})/;
    if (!password.match(regexPassword)) {
        res.status(400).json({
            message: "Le mot de passe est invalide."
        })
        return false;
    }
    return true;
}

export const usernameChecker = (username, req, res) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,16}$/;
    if (!username.match(usernameRegex)) {
        res.status(400).json({
            message: "Le nom d'utilisateur est invalide"
        })
        return false;
    }
    return true;
}

export const phoneNumberChecker = (phoneNumber, req, res) => {
    // @ts-ignore
    const phoneStatus = phone(phoneNumber);
    if (!phoneStatus.isValid) {
        res.status(400).json({
            message: "Le numéro de téléphone est invalide."
        })
        return false;
    }
    // @ts-ignore
    if (!["+221", "+229", "+228", "+226", "+225", "+223", "+227"].includes(phoneStatus.countryCode)) {
        res.status(400).json({
            message: "Veuillez utiliser un numéro de la zone UEMOA"
        })
        return false;
    }
    return true;
}

router.post("/signin-phone", async (req, res)=>{
    const {phone_number} = req.body;

    if(!phone_number) { res.status(400).json({message: "Les données sont invalides"}); return; }
    if(!phoneNumberChecker(phone_number, req, res)) return;

    const user = await prisma.user.findUnique({ where: {phone_number: phone_number} })

    if(!user) { res.status(404).json({message: "L'utilisateur n'existe pas !"}); return;}

    const access_token = await generateSmsCode(user)

    if(!access_token) res.sendStatus(500)
    res.status(200).json({
        access_token: access_token
    })
})

router.post("/signin-phone/otp", (req, res)=> {
    try{
        const access_token = ent.encode(req.headers["authorization"] || "")
        const {otp_code} = req.body

        if(!access_token){
            res.status(401).json({
                message: "Vous n'avez pas l'autorisation pour éffectuer cette requête."
            })
            return;
        }
        if (!/^\d{6}$/.test(otp_code)) {
            res.status(400).json({
                message: 'Code invalide.'
            })
            return;
        }

        /*Verifier si le token est valid*/
        const user = jsonwebtoken.verify(access_token, process.env.JWT_KEY)
        /**/

        if(otp_code != user.otp_code){
            res.status(401).json({message: "Code d'authentification incorrect"})
        }
        else res.sendStatus(200)

    }catch (e){
        res.status(403).json({
            message: "Invalid credentials"
        })
    }

})

export const generateSmsCode = async (user) => {
    try {
        const smsCode = randomInteger(100000, 999999);
        const text = `Bonjour cher utilisateur, votre code est le suivant : ${smsCode}`;
        const destination = user.phone_number.split('+')[1];
        /*await pushSMS(text, destination);*/
        await mail_client.sendMail({
            from: `ESP Auth < ${process.env.MAIL_USER} >`,
            to: user.email,
            subject: "Confirmation de connexion",
            html: `Bonjour cher utilisateur, votre code de connexion est le suivant : <b>${smsCode}</b>`
        })
        return jsonwebtoken.sign({ firstname: user.firstname, lastname: user.lastname, password: user.password, phone_number: user.phone_number, otp_code: smsCode, is_verified: false },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
    );
    } catch (e) {
        console.log(e);
    }
};