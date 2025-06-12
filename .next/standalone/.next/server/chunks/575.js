exports.id = 575;
exports.ids = [575];
exports.modules = {

/***/ 1313:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 3842))

/***/ }),

/***/ 5361:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 9222, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 8301, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 3751, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 4765, 23));
Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 5192, 23))

/***/ }),

/***/ 3842:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ WithSidebarLayout)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6931);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _components_ClientLayout__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5531);
// app/(withSidebar)/layout.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 

function WithSidebarLayout({ children  }) {
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_components_ClientLayout__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .Z, {
        children: children
    });
}


/***/ }),

/***/ 5531:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "Z": () => (/* binding */ ClientLayout)
});

// EXTERNAL MODULE: external "next/dist/compiled/react-experimental/jsx-runtime"
var jsx_runtime_ = __webpack_require__(6931);
// EXTERNAL MODULE: external "next/dist/compiled/react-experimental"
var react_experimental_ = __webpack_require__(7640);
// EXTERNAL MODULE: ./node_modules/next-auth/react/index.js
var react = __webpack_require__(3370);
// EXTERNAL MODULE: ./node_modules/next/navigation.js
var navigation = __webpack_require__(9483);
;// CONCATENATED MODULE: ./components/AdminSidebar/AdminSidebar.tsx

function AdminSidebar() {
    return /*#__PURE__*/ jsx_runtime_.jsx("aside", {
        className: "w-64 bg-white shadow p-4",
        children: /*#__PURE__*/ jsx_runtime_.jsx("nav", {
            children: /*#__PURE__*/ (0,jsx_runtime_.jsxs)("ul", {
                className: "space-y-2 text-sm",
                children: [
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/dashboard",
                            children: "Dashboard"
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/approvals",
                            children: "Approvals"
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/employees",
                            children: "Employees"
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/reports",
                            children: "Reports"
                        })
                    })
                ]
            })
        })
    });
}

;// CONCATENATED MODULE: ./components/ManagerSidebar/ManagerSidebar.tsx

function ManagerSidebar() {
    return /*#__PURE__*/ jsx_runtime_.jsx("aside", {
        className: "w-64 bg-white shadow p-4",
        children: /*#__PURE__*/ jsx_runtime_.jsx("nav", {
            children: /*#__PURE__*/ (0,jsx_runtime_.jsxs)("ul", {
                className: "space-y-2 text-sm",
                children: [
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/dashboard",
                            children: "Dashboard"
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/approvals",
                            children: "Leave Approvals"
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/calendar",
                            children: "Team Calendar"
                        })
                    })
                ]
            })
        })
    });
}

;// CONCATENATED MODULE: ./components/EmployeeSidebar/EmployeeSidebar.tsx

function EmployeeSidebar() {
    return /*#__PURE__*/ jsx_runtime_.jsx("aside", {
        className: "w-64 bg-white shadow p-4",
        children: /*#__PURE__*/ jsx_runtime_.jsx("nav", {
            children: /*#__PURE__*/ (0,jsx_runtime_.jsxs)("ul", {
                className: "space-y-2 text-sm",
                children: [
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/dashboard",
                            children: "Dashboard"
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/calendar",
                            children: "My Calendar"
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime_.jsx("li", {
                        children: /*#__PURE__*/ jsx_runtime_.jsx("a", {
                            href: "/documents",
                            children: "Documents"
                        })
                    })
                ]
            })
        })
    });
}

;// CONCATENATED MODULE: ./components/ClientLayout.tsx
/* __next_internal_client_entry_do_not_use__ default auto */ 






function ClientLayout({ children  }) {
    const pathname = (0,navigation.usePathname)() || "";
    const { data: session , status  } = (0,react.useSession)();
    const isProfilePage = pathname.startsWith("/employees/") && pathname.split("/").length > 2;
    if (status === "loading") return null;
    const role = session?.user?.role;
    let SidebarComponent = null;
    if (role === "ADMIN") SidebarComponent = /*#__PURE__*/ jsx_runtime_.jsx(AdminSidebar, {});
    else if (role === "MANAGER") SidebarComponent = /*#__PURE__*/ jsx_runtime_.jsx(ManagerSidebar, {});
    else SidebarComponent = /*#__PURE__*/ jsx_runtime_.jsx(EmployeeSidebar, {});
    return /*#__PURE__*/ (0,jsx_runtime_.jsxs)("div", {
        className: "flex min-h-screen bg-gray-100",
        children: [
            !isProfilePage && SidebarComponent,
            /*#__PURE__*/ jsx_runtime_.jsx("main", {
                className: "flex-1 p-6",
                children: children
            })
        ]
    });
}


/***/ }),

/***/ 5665:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "$$typeof": () => (/* binding */ $$typeof),
/* harmony export */   "__esModule": () => (/* binding */ __esModule),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5985);

const proxy = (0,next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__.createProxy)(String.raw`C:\Users\macke\Downloads\CoreNZ\clean-corenz-frontend\app\(withSidebar)\layout.tsx`)

// Accessing the __esModule property and exporting $$typeof are required here.
// The __esModule getter forces the proxy target to create the default export
// and the $$typeof value is for rendering logic to determine if the module
// is a client boundary.
const { __esModule, $$typeof } = proxy;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (proxy.default);


/***/ })

};
;