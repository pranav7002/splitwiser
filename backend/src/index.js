import dotenv from "dotenv"
import connectDB from "./db/connectDB.js"

dotenv.config()   // auto-loads from project root

connectDB()













// import express from "express"
// const app = express()
  // ;(async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
//     app.on("error", (error) => {
//       console.log("ERROR", error)
//       throw error
//     })

//     app.listen(process.env.PORT, () => {
//       console.log(`app is listening on ${process.env.PORT}`)
//     })
//   } catch (error) {
//     console.log("ERROR:", error)
//     throw error
//   }
// })()