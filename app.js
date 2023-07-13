import express from "express";
import { PrismaClient } from '@prisma/client';
import {router as authRouter} from "./routes/auth.js";
import bodyParser from "body-parser";
import cors from "cors"


const PORT = process.env.PORT || 8080;
export const prisma = new PrismaClient();
const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())

app.use('/api', authRouter)

app.listen(PORT, ()=> console.log("App start running on http://localhost:8080"))