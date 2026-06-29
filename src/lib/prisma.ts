import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

export default prisma;
