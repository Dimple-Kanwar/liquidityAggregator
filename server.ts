import express from "express";
import bodyParser from 'body-parser';
import { writeFileSync } from 'fs';

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

const PORT = process.env.PORT || 3000;

app.post("/generate_config", (req, res) => {
    generate_config(req.body);
    res.status(200).json({message: "Configuration generated successfully."});
    process.exit(0);
});
app.listen(PORT, () => console.log(`⚡Server is running here 👉 http://localhost:${PORT}`));

const generate_config = (config_data:any) => {
    //save updated config data in config.json file
   return  writeFileSync("./app/config.json", JSON.stringify(config_data), {encoding: "utf8"});
}
