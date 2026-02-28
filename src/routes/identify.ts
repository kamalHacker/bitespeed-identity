import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  // Validate - at least one must be present
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'email or phoneNumber is required' });
  }

  // Step 1: Find all contacts matching email OR phoneNumber
  const matchingContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        email ? { email } : {},
        phoneNumber ? { phoneNumber } : {},
      ].filter(obj => Object.keys(obj).length > 0),
    },
  });

  // Step 2: If no matches, create a new primary contact
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkPrecedence: 'primary',
      },
    });

    return res.status(200).json({
      contact: {
        primaryContatctId: newContact.id,
        emails: newContact.email ? [newContact.email] : [],
        phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        secondaryContactIds: [],
      },
    });
  }

  // Step 3: Gather all primary IDs from matched contacts
  const primaryIds = new Set<number>();

  for (const contact of matchingContacts) {
    if (contact.linkPrecedence === 'primary') {
      primaryIds.add(contact.id);
    } else if (contact.linkedId) {
      primaryIds.add(contact.linkedId);
    }
  }

  // Step 4: Fetch all contacts across all involved clusters
  const allContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: [...primaryIds] } },
        { linkedId: { in: [...primaryIds] } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  // Step 5: Determine the true primary (oldest createdAt)
  const primaries = allContacts.filter(c => c.linkPrecedence === 'primary');
  primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const truePrimary = primaries[0];

  // Step 6: Demote any other primaries to secondary
  const otherPrimaries = primaries.slice(1);
  if (otherPrimaries.length > 0) {
    await prisma.contact.updateMany({
      where: { id: { in: otherPrimaries.map(c => c.id) } },
      data: {
        linkPrecedence: 'secondary',
        linkedId: truePrimary.id,
        updatedAt: new Date(),
      },
    });
  }

  // Step 7: Check if incoming request has new information
  const allEmails = new Set(allContacts.map(c => c.email).filter(Boolean));
  const allPhones = new Set(allContacts.map(c => c.phoneNumber).filter(Boolean));

  const isNewEmail = email && !allEmails.has(email);
  const isNewPhone = phoneNumber && !allPhones.has(phoneNumber);

  if (isNewEmail || isNewPhone) {
    await prisma.contact.create({
      data: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        linkedId: truePrimary.id,
        linkPrecedence: 'secondary',
      },
    });
  }

  // Step 8: Fetch the final consolidated cluster
  const finalContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: truePrimary.id },
        { linkedId: truePrimary.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  // Step 9: Build response
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  const secondaryContactIds: number[] = [];

  // Primary first
  if (truePrimary.email) emails.push(truePrimary.email);
  if (truePrimary.phoneNumber) phoneNumbers.push(truePrimary.phoneNumber);

  for (const contact of finalContacts) {
    if (contact.id === truePrimary.id) continue;
    secondaryContactIds.push(contact.id);
    if (contact.email && !emails.includes(contact.email)) emails.push(contact.email);
    if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) phoneNumbers.push(contact.phoneNumber);
  }

  return res.status(200).json({
    contact: {
      primaryContatctId: truePrimary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  });
});

export default router;