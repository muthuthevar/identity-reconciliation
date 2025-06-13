import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface ContactAttributes {
  id: number;
  phoneNumber?: string;
  email?: string;
  linkedId?: number | null;
  linkPrecedence: "primary" | "secondary";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

interface ContactCreationAttributes
  extends Optional<
    ContactAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {}

class Contact
  extends Model<ContactAttributes, ContactCreationAttributes>
  implements ContactAttributes
{
  public id!: number;
  public phoneNumber!: string;
  public email!: string;
  public linkedId!: number | null;
  public linkPrecedence!: "primary" | "secondary";
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Contact.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    phoneNumber: {
      type: DataTypes.STRING(50),
    },
    email: {
      type: DataTypes.STRING(100),
      validate: {
        isEmail: true,
      },
    },
    linkedId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    linkPrecedence: {
      type: DataTypes.ENUM("secondary", "primary"),
      defaultValue: "primary",
    },
  },
  {
    sequelize,
    modelName: "Contact",
    tableName: "contact",
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ["email", "phone_number"],
      },
    ],
  }
);

export default Contact;
export type { ContactAttributes, ContactCreationAttributes };
