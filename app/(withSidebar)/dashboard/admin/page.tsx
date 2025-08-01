// app/dashboard/admin/page.tsx







import { getServerSession } from "next-auth";



import { authOptions } from "@/lib/auth-options";



import { prisma } from "@/lib/prisma";



import { redirect } from "next/navigation";



<<<<<<<


=======
  return (

    <div className="flex flex-col flex-1 w-full min-h-screen bg-content-panel">

      {/* Sticky Header */}

      <div className="sticky top-0 z-10 bg-content-panel border-b border-enhanced backdrop-blur-sm">

        <div className="px-8 py-6">

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-3xl font-bold text-foreground mb-2">

                Hi, {user.firstName ?? ""} 👋

              </h1>

              <p className="text-muted-foreground text-base">

                Welcome back to your admin dashboard

              </p>

            </div>

            <div className="flex items-center space-x-4">

              <div className="relative max-w-md">

                <input

                  type="text"

                  placeholder="Search..."

                  className="w-full rounded-md border border-enhanced bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"

                />

              </div>

            </div>

          </div>

        </div>

      </div>

>>>>>>>


<<<<<<<
import dynamic from "next/dynamic";

=======
      {/* Content Area */}

      <main className="flex-1 px-8 py-6">

        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Leave Summary Card for holiday management */}

          <LeaveSummaryCard employeeId={user.employee.id} />

>>>>>>>


<<<<<<<
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";







// Dynamically load the client portion (no SSR)



const AdminDashboardClient = dynamic(() => import("./AdminDashboardClient"), { ssr: false });







export default async function AdminDashboardPage() {



  const session = await getServerSession(authOptions);



  if (!session?.user) redirect("/login");







  const user = await prisma.user.findUnique({



    where: { id: session.user.id },



    include: {



      employee: { include: { leaveEntitlements: { include: { eventCategory: true } } } },



    },



  });



  if (!user?.employee) redirect("/dashboard/employee");







  return (



    <div className="flex flex-col flex-1 w-full">



      {/* Header */}



      <div className="w-full px-6 pt-6 flex items-center justify-between">



        <h1 className="text-xl sm:text-2xl font-bold">



          Hi, {user.firstName ?? ""} 👋



        </h1>



      </div>







      <div className="px-6 mt-4 mb-2 max-w-md relative">



        <input



          type="text"



          placeholder="Search..."



          className="w-full rounded-lg border px-4 py-2"



        />



      </div>







      {/* Unified Grid */}



      <main className="flex-1 p-6 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">



        {/* Leave Summary Card for holiday management */}



        <LeaveSummaryCard employeeId={user.employee.id} />







        {/* Client-only Admin Dashboard widgets */}



        <AdminDashboardClient



          employeeId={user.employee.id}



          firstName={user.firstName ?? ""}



        />



      </main>



    </div>



  );



=======
          {/* Client-only Admin Dashboard widgets */}

          <AdminDashboardClient

            employeeId={user.employee.id}

            firstName={user.firstName ?? ""}

          />

        </div>

      </main>

    </div>

  );

>>>>>>>
}
