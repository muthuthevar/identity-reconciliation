import { Request, Response } from "express";
import { ValidationError } from "sequelize";
import { identifyContact } from "../services/contact.service";

export const createContact = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, email } = req.body;

    const result = await identifyContact(email, phoneNumber);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    } else {
      console.error("Error creating contact:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};
