"use strict";
exports.id = 503;
exports.ids = [503];
exports.modules = {

/***/ 6503:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Z": () => (/* binding */ Button)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6931);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var class_variance_authority__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7247);
/* harmony import */ var clsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5892);
/* __next_internal_client_entry_do_not_use__ default auto */ 


const button = (0,class_variance_authority__WEBPACK_IMPORTED_MODULE_1__/* .cva */ .j)("inline-flex items-center justify-center font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2", {
    variants: {
        variant: {
            primary: "bg-indigo-600 text-white hover:bg-indigo-700",
            ghost: "bg-transparent hover:bg-gray-100 text-gray-800",
            danger: "bg-red-600 text-white hover:bg-red-700"
        },
        size: {
            sm: "px-3 py-1.5 text-sm rounded-md",
            md: "px-4 py-2 text-sm rounded-md",
            lg: "px-6 py-3 text-base rounded-lg"
        }
    },
    defaultVariants: {
        variant: "primary",
        size: "md"
    }
});
function Button({ children , className , variant ="primary" , size ="md" , type ="button" , ...props }) {
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("button", {
        type: type,
        className: (0,clsx__WEBPACK_IMPORTED_MODULE_2__/* ["default"] */ .Z)(button({
            variant,
            size
        }), className),
        ...props,
        children: children
    });
}


/***/ })

};
;