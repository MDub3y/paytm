import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt";
import { Account, NextAuthOptions, User } from "next-auth";
import { AdapterUser } from "next-auth/adapters";

interface Credentials{
    phone: string,
    password: string
}

export const authOptions: NextAuthOptions = {
    providers: [
      CredentialsProvider({
          name: 'Credentials',
          credentials: {
            phone: { label: "Phone number", type: "text", placeholder: "1231231231", required: true },
            password: { label: "Password", type: "password", required: true }
          },
          // TODO: User credentials type from next-aut
          async authorize(credentials: Credentials | undefined) {
            // Do zod validation, OTP validation here
            if(!credentials){ return null; }

            const hashedPassword = await bcrypt.hash(credentials.password, 10);
            const existingUser = await db.user.findFirst({
                where: {
                    number: credentials.phone
                }
            });

            if (existingUser) {
                const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
                if (passwordValidation) {
                    return {
                        id: existingUser.id.toString(),
                        name: existingUser.name,
                        number: existingUser.number
                    }
                }
                return null;
            }

            try {
                const user = await db.user.create({
                    data: {
                        number: credentials.phone,
                        password: hashedPassword
                    }
                });
            
                return {
                    id: user.id.toString(),
                    name: user.name,
                    number: user.number
                }
            } catch(e) {
                console.error(e);
            }

            return null
          },
        })
    ],
    secret: process.env.JWT_SECRET || "secret",
    callbacks: {
        // TODO: can u fix the type here? Using any is bad
        async session({ token, session }: any) {
            session.user.id = token.sub

            return session
        },

        async signIn({ user, account, profile }: { user: User | AdapterUser; account: Account | null; profile?: any }) {
            // Ensure that the user email is defined
            if (user?.id) {
              // You can add your own signIn logic here (e.g., check the account provider)
              return true;
            }
            return false; // Reject sign-in if user.email is not defined
          }
    }
  }
  