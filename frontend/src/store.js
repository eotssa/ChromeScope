import { configureStore } from '@reduxjs/toolkit'
import notificationReducer from './reducers/notification'
import blogsReducer from './reducers/blogs'
import userReducer from './reducers/user'
import usersReducer from './reducers/users'

const store = configureStore({
  reducer: {
  }
})

export default store