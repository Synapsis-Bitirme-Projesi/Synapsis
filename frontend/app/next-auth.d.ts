import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            full_name: string;
            settings?: {
                widgets: string[];
                theme?: string;
            };
        } & DefaultSession["user"];
    }

    interface User {
        settings?: {
            widgets: string[];
            theme?: string;
        };
    }
}