import React from "react"

const Layout = ({ children }) => {
  return (
    <>
      <div className="navbar z-101 border-b-100">
        <div className="container mx-auto px-4 lg:px-44">
          <div className="flex-1 font-bold">
            <a className=" text-3xl">Chromescope</a>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}

export default Layout
