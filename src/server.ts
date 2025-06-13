import app from "./app";
import sequelize from "./config/database";

app.listen(3000, async () => {
  await sequelize.authenticate();
  console.log("Database connection established successfully");
  await sequelize.sync({ force: false, alter: false });
  console.log("Server started on port 3000");
});
