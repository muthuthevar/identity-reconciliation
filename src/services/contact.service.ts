import { Op } from "sequelize";
import Contact, { ContactCreationAttributes } from "../models/contact";

export async function identifyContact(email: string, phoneNumber: string) {
  const existingContacts = await findMatchingContacts(email, phoneNumber);

  if (existingContacts.length === 0) {
    const newContact = await createContact({
      email,
      phoneNumber,
      linkPrecedence: "primary",
      linkedId: null,
    });

    return formatResponse([newContact], []);
  }

  const allLinkedContacts = await getAllLinkedContacts(existingContacts);

  const needsNewContact = shouldCreateNewContact(
    allLinkedContacts,
    email,
    phoneNumber
  );

  if (needsNewContact) {
    const primaryContact = allLinkedContacts.find(
      (c: Contact) => c.linkPrecedence === "primary"
    );

    if (!primaryContact) {
      throw new Error("Primary contact not found");
    }

    const newSecondary = await createContact({
      email,
      phoneNumber,
      linkPrecedence: "secondary",
      linkedId: primaryContact.id,
    });
    allLinkedContacts.push(newSecondary);
  }

  await handlePrimaryContactLinking(allLinkedContacts);

  const finalContacts = await getAllLinkedContacts(allLinkedContacts);
  const primary = finalContacts.find(
    (c: Contact) => c.linkPrecedence === "primary"
  );
  const secondaries = finalContacts.filter(
    (c: Contact) => c.linkPrecedence === "secondary"
  );

  if (!primary) {
    throw new Error("No primary contact found after processing");
  }

  return formatResponse([primary], secondaries);
}

export async function findMatchingContacts(email: string, phoneNumber: string) {
  const conditions = [];
  if (email) conditions.push({ email });
  if (phoneNumber) conditions.push({ phoneNumber });

  return await Contact.findAll({
    where: {
      [Op.or]: conditions,
      deletedAt: null,
    },
  });
}

export async function getAllLinkedContacts(contacts: Contact[]) {
  const allIds = new Set<number>();

  contacts.forEach((contact: Contact) => {
    allIds.add(contact.id);
    if (contact.linkedId) allIds.add(contact.linkedId);
  });

  const linkedContacts = await Contact.findAll({
    where: {
      [Op.or]: [
        { id: { [Op.in]: Array.from(allIds) } },
        { linkedId: { [Op.in]: Array.from(allIds) } },
      ],
      deletedAt: null,
    },
    order: [["createdAt", "ASC"]],
  });

  return linkedContacts;
}

function shouldCreateNewContact(
  existingContacts: Contact[],
  email: string,
  phoneNumber: string
) {
  const exactMatch = existingContacts.find(
    (contact: Contact) =>
      contact.email === email && contact.phoneNumber === phoneNumber
  );

  if (exactMatch) return false;

  const hasNewEmail =
    email && !existingContacts.some((c: Contact) => c.email === email);
  const hasNewPhone =
    phoneNumber &&
    !existingContacts.some((c: Contact) => c.phoneNumber === phoneNumber);

  return hasNewEmail || hasNewPhone;
}

async function handlePrimaryContactLinking(contacts: Contact[]) {
  const primaries = contacts.filter(
    (c: Contact) => c.linkPrecedence === "primary"
  );

  if (primaries.length > 1) {
    primaries.sort(
      (a: Contact, b: Contact) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const oldestPrimary = primaries[0];

    for (let i = 1; i < primaries.length; i++) {
      const primaryToConvert = primaries[i];
      await Contact.update(
        {
          linkedId: oldestPrimary.id,
          linkPrecedence: "secondary",
          updatedAt: new Date(),
        },
        {
          where: { id: primaryToConvert.id },
        }
      );

      await Contact.update(
        {
          linkedId: oldestPrimary.id,
          updatedAt: new Date(),
        },
        {
          where: { linkedId: primaryToConvert.id },
        }
      );
    }
  }
}

async function createContact(contactData: ContactCreationAttributes) {
  return await Contact.create(contactData);
}

function formatResponse(
  primaryContacts: Contact[],
  secondaryContacts: Contact[]
) {
  const primary = primaryContacts[0];
  const allContacts = [...primaryContacts, ...secondaryContacts];

  const emails = [
    ...new Set(
      allContacts
        .map((c: Contact) => c.email)
        .filter((email): email is string => Boolean(email))
    ),
  ];

  const phoneNumbers = [
    ...new Set(
      allContacts
        .map((c: Contact) => c.phoneNumber)
        .filter((phone): phone is string => Boolean(phone))
    ),
  ];

  return {
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryContacts.map((c: Contact) => c.id),
    },
  };
}
