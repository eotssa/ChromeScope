import React from "react"
import { Link } from "react-router-dom"

const Layout = ({ children }) => {
  return (
    <>
      <div className="navbar sticky top-0 z-50 border-b bg-base-100">
        <div className="container mx-auto lg:px-44">
          <div className="flex-1 font-bold">
            <a className="btn btn-ghost hover:bg-white text-4xl font-bold	">
              <Link to="/">Chromescope</Link>
            </a>
          </div>
          <div className="flex-none">
            <ul className="menu menu-horizontal text-lg	 pr-10 font-bold">
              <li>
                <Link to="/docs">Docs</Link>
              </li>
              {/* <li>
                <Link to="/pricing">Pricing</Link>
              </li>
              <li>
                <Link to="/support">Support Me</Link>
              </li> */}
            </ul>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}

export default Layout
