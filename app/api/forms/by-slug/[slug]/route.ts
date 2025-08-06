import { NextResponse } from "next/server";



import { getServerSession } from "next-auth";



import { authOptions } from "@/lib/auth-options";



import { prisma } from "@/lib/prisma";







<<<<<<<
// GET: Fetch form by slug

=======
    // Build visibility filter if employee info is available

    let visibilityFilter = {};

    if (employee) {

      const userRole = employee.user?.role || 'EMPLOYEE';

      const userDepartment = employee.user?.department?.name;

      const userJobRole = employee.user?.jobRole?.name;



      visibilityFilter = {

        AND: [

          {

            OR: [

              // Forms visible to employee's role

              { visibleToRoles: { has: userRole } },

              // Forms visible to employee's department (if they have one and form specifies departments)

              ...(userDepartment ? [{

                AND: [

                  { visibleToDepartments: { not: { isEmpty: true } } },

                  { visibleToDepartments: { has: userDepartment } }

                ]

              }] : []),

              // Forms visible to employee's job role (if they have one and form specifies job roles)

              ...(userJobRole ? [{

                AND: [

                  { visibleToJobRoles: { not: { isEmpty: true } } },

                  { visibleToJobRoles: { has: userJobRole } }

                ]

              }] : []),

            ],

          }

        ]

      };

    }



    const form = await prisma.form.findFirst({

      where: {

        slug: params.slug,

        companyId: session.user.companyId,

        isActive: true,

        ...visibilityFilter,

      },

      select: {

        id: true,

        name: true,

        slug: true,

        description: true,

        formType: true,

        schema: true,

      },

    });

>>>>>>>


export async function GET(req: Request, { params }: { params: { slug: string } }) {



  const session = await getServerSession(authOptions);







  if (!session?.user?.companyId) {



    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });



  }







  const url = new URL(req.url);



  const employeeId = url.searchParams.get('employeeId');







  try {



    // Get employee info if employeeId is provided (for visibility filtering)



    let employee = null;



    if (employeeId) {



      employee = await prisma.employee.findFirst({



        where: {



          id: employeeId,



          companyId: session.user.companyId,



        },



        include: {



          user: {



            include: {



              jobRole: true,



              department: true,



            },



          },



        },



      });



    }







    const form = await prisma.form.findFirst({



      where: {



        slug: params.slug,



        companyId: session.user.companyId,



        isActive: true,



        ...(employee



          ? {



              OR: [



                // Forms visible to all roles (empty array or null)



                { visibleToRoles: { isEmpty: true } },



                { visibleToRoles: { equals: null } },



                // Forms visible to employee's role



                { visibleToRoles: { has: employee.user?.role || 'EMPLOYEE' } },



                // Forms visible to employee's department



                ...(employee.user?.department?.name



                  ? [{ visibleToDepartments: { has: employee.user.department.name } }]



                  : []),



                // Forms visible to employee's job role



                ...(employee.user?.jobRole?.name



                  ? [{ visibleToJobRoles: { has: employee.user.jobRole.name } }]



                  : []),



              ],



            }



          : {}),



      },



      select: {



        id: true,



        name: true,



        slug: true,



        description: true,



        formType: true,



        schema: true,



      },



    });







    if (!form) {



      return NextResponse.json({ error: "Form not found" }, { status: 404 });



    }







    return NextResponse.json(form);



  } catch (error) {



    console.error("Error fetching form by slug:", error);



    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



  }



}



