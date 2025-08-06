// app/employees/[id]/layout.tsx







import Link from "next/link";



<<<<<<<
import { ReactNode } from "react";

=======
export default async function EmployeeLayout({ children, params }: EmployeeLayoutProps) {

  const employee = await prisma.employee.findUnique({

    where: { id: params.id },

    include: {

      user: {

        include: {

          jobRole: true,

          department: true,

        }

      }

    },

  });

>>>>>>>


import { prisma } from "@/lib/prisma";



<<<<<<<


=======
  // Fetch active forms for this company that are visible to this employee

  const forms = await prisma.form.findMany({

    where: {

      companyId: employee.companyId || '',

      isActive: true,

      OR: [

        // Forms visible to all roles (empty array or null)

        { visibleToRoles: { isEmpty: true } },

        { visibleToRoles: null },

        // Forms visible to employee's role

        { visibleToRoles: { has: employee.user?.role || 'EMPLOYEE' } },

        // Forms visible to employee's department

        ...(employee.user?.department?.name ? [{ visibleToDepartments: { has: employee.user.department.name } }] : []),

        // Forms visible to employee's job role

        ...(employee.user?.jobRole?.name ? [{ visibleToJobRoles: { has: employee.user.jobRole.name } }] : []),

      ],

    },

    select: {

      slug: true,

      name: true,

      formType: true,

    },

    orderBy: {

      name: 'asc',

    },

  });

>>>>>>>


<<<<<<<
interface EmployeeLayoutProps {

=======




  const menu = [

    { href: `/employees/${params.id}/overview`, label: "Overview" },

    { href: `/employees/${params.id}/leave`, label: "Leave" },

    { href: `/employees/${params.id}/documents`, label: "Documents" },

    // Dynamic form links

    ...forms.map(form => ({

      href: `/employees/${params.id}/${form.slug}`,

      label: form.name,

    })),

    { href: `/employees/${params.id}/performance`, label: "Performance" },

    { href: `/employees/${params.id}/onboarding`, label: "Onboarding History" },

    { href: `/employees/${params.id}/driver-licenses`, label: "Driver Licenses" },

    { href: `/employees/${params.id}/training`, label: "Training" },

    { href: `/employees/${params.id}/employment-checks`, label: "Employment Checks" },

    { href: `/employees/${params.id}/settings`, label: "Settings" },

  ];

>>>>>>>


  children: ReactNode;



  params: { id: string };



}







export default async function EmployeeLayout({ children, params }: EmployeeLayoutProps) {



  const employee = await prisma.employee.findUnique({



    where: { id: params.id },



    include: { user: true },



  });







  if (!employee) {



    return <div>Employee not found.</div>;



  }







  // Fetch active forms for this company



  const forms = await prisma.form.findMany({



    where: {



      companyId: employee.companyId || '',



      isActive: true,



    },



    select: {



      slug: true,



      name: true,



    },



    orderBy: {



      name: 'asc',



    },



  });







  const menu = [



    { href: `/employees/${params.id}/overview`, label: "Overview" },



    { href: `/employees/${params.id}/leave`, label: "Leave" },



    { href: `/employees/${params.id}/documents`, label: "Documents" },



    // Dynamic form links



    ...forms.map(form => ({



      href: `/employees/${params.id}/${form.slug}`,



      label: form.name,



    })),



    { href: `/employees/${params.id}/performance`, label: "Performance" },



    { href: `/employees/${params.id}/onboarding`, label: "Onboarding History" },



    { href: `/employees/${params.id}/driver-licenses`, label: "Driver Licenses" },



    { href: `/employees/${params.id}/training`, label: "Training" },



    { href: `/employees/${params.id}/employment-checks`, label: "Employment Checks" },



    { href: `/employees/${params.id}/settings`, label: "Settings" },



  ];







  return (



    <div className="flex min-h-screen">



      {/* Profile sidebar */}



      <aside className="w-64 bg-white p-4 border-r">



        <h2 className="text-lg font-bold mb-4">{employee.user?.name}</h2>



        <nav className="space-y-2">



          {menu.map((item) => (



            <Link



              key={item.href}



              href={item.href}



              className="block rounded-md px-3 py-2 hover:bg-gray-100 text-sm"



            >



              {item.label}



            </Link>



          ))}



        </nav>



      </aside>







      {/* Profile content */}



      <main className="flex-1 p-6">{children}</main>



    </div>



  );



}



