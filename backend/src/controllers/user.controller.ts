import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { sendResponse, sendError } from '../utils/response';

const userService = new UserService();

export class UserController {
  async getAll(req: any, res: any) {
    try {
      const users = await userService.findAll();
      sendResponse(res, users);
    } catch (error) {
      console.error('Error getting users:', error);
      sendError(res, 'Failed to fetch users');
    }
  }

  async create(req: any, res: any) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 'Email and password are required', 400);
      }
      
      const user = await userService.create(req.body);
      sendResponse(res, user, 'User created successfully', 201);
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.code === '23505') { // Postgres unique violation
        return sendError(res, 'Email or username already exists', 409);
      }
      sendError(res, 'Failed to create user');
    }
  }

  async delete(req: any, res: any) {
    try {
      const { id } = req.params;
      await userService.delete(id);
      sendResponse(res, null, 'User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      sendError(res, 'Failed to delete user');
    }
  }
}
