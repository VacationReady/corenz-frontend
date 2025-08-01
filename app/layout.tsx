// /app/layout.tsx







"use client";



<<<<<<<




import "./globals.css";



import { ReactNode } from "react";



import { Toaster } from "sonner";



import { SessionProvider } from "next-auth/react"; // ✅ Added







export default function RootLayout({ children }: { children: ReactNode }) {



  return (



    <html lang="en">



      <body className="bg-surface min-h-screen font-sans text-gray-900 dark:text-gray-100 dark:bg-surface-dark">



        <SessionProvider> {/* ✅ Wrap app in SessionProvider */}



          {children}



        </SessionProvider>



        <Toaster position="top-center" richColors closeButton />



      </body>



    </html>



  );



}



=======
export default function RootLayout({ children }: { children: ReactNode }) {

  return (

    <html lang="en">

      <body className="bg-app-background min-h-screen font-sans text-foreground antialiased">

        <SessionProvider> {/* ✅ Wrap app in SessionProvider */}

          {children}

        </SessionProvider>

        <Toaster

          position="bottom-right"

          richColors

          closeButton

          toastOptions={{

            className: 'shadow-enterprise border-enhanced',

            style: {

              background: 'hsl(var(--card))',

              color: 'hsl(var(--card-foreground))',

              border: '1px solid hsl(var(--border))',

            }

          }}

        />

      </body>

    </html>

  );

}

>>>>>>>
