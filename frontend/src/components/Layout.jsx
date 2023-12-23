import React from "react"

const Layout = ({ children }) => {
  return (
    <>
      <div className="navbar sticky top-0 z-50 border-b">
        <div className="container mx-auto px-44">
          <div className="pl-6 flex-1 font-bold">
            <a className="btn btn-ghost text-3xl">Chromescope</a>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}

export default Layout
