import { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { UserService } from '../services/userService';

// Get all users
export const getAllUsers: RequestHandler = async (req, res, next) => {
  try {
    const userService = UserService.getInstance();
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getUserById: RequestHandler = async (req, res, next) => {
  try {
    const userService = UserService.getInstance();
    const user = await userService.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userService = UserService.getInstance();
    const { name, email } = req.body;
    
    // Check if email is being updated and is not already taken
    if (email) {
      const existingUser = await userService.findByEmail(email);
      if (existingUser && existingUser.id !== req.params.id) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }
    }

    const updatedUser = await userService.updateUser(req.params.id, { name, email });
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// Update user role
export const updateUserRole: RequestHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userService = UserService.getInstance();
    const { role } = req.body;
    
    const updatedUser = await userService.updateUserRole(req.params.id, role);
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// Delete user
export const deleteUser: RequestHandler = async (req, res, next) => {
  try {
    const userService = UserService.getInstance();
    const userId = req.params.id;
    
    // First check if user exists
    const user = await userService.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Attempt to delete the user
    const deleted = await userService.deleteUser(userId);
    
    if (!deleted) {
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete user',
        code: 'DELETE_FAILED'
      });
      return;
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      code: 'USER_DELETED',
      data: {
        id: userId,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};
