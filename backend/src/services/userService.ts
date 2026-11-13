import { User, IUser } from '../models/User.js';
import { SavedAddress } from '../types/index.js';

export class UserService {
  static async getProfile(userId: string): Promise<IUser | null> {
    return User.findById(userId).select('-refreshTokenHash');
  }

  static async updateProfile(
    userId: string,
    updates: {
      name?: string;
      profileImage?: string;
      email?: string;
      isProfileCompleted?: boolean;
      currentLocation?: { coordinates: [number, number]; address?: string };
    }
  ): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    if (updates.name !== undefined) {
      user.name = updates.name.trim();
    }

    if (updates.profileImage !== undefined) {
      user.profileImage = updates.profileImage;
    }

    if (updates.email !== undefined) {
      user.email = updates.email.trim();
    }

    if (updates.isProfileCompleted !== undefined) {
      user.isProfileCompleted = updates.isProfileCompleted;
    }

    if (updates.currentLocation) {
      user.currentLocation = {
        type: 'Point',
        coordinates: updates.currentLocation.coordinates,
        address: updates.currentLocation.address,
      };
    }

    await user.save();
    return user;
  }

  static async addSavedLocation(userId: string, locationData: SavedAddress): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    if (locationData.isDefault) {
      user.savedLocations.forEach((loc) => {
        loc.isDefault = false;
      });
    }

    user.savedLocations.push(locationData);
    await user.save();
    return user;
  }

  static async updateSavedLocation(
    userId: string,
    locationId: string,
    locationData: Partial<SavedAddress>
  ): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    const loc = (user.savedLocations as any).id(locationId);
    if (!loc) return null;

    if (locationData.label) loc.label = locationData.label;
    if (locationData.address) loc.address = locationData.address;
    if (locationData.landmark !== undefined) loc.landmark = locationData.landmark;
    if (locationData.coordinates) loc.coordinates = locationData.coordinates;

    if (locationData.isDefault) {
      user.savedLocations.forEach((l: any) => {
        l.isDefault = l._id.toString() === locationId;
      });
    }

    await user.save();
    return user;
  }

  static async deleteSavedLocation(userId: string, locationId: string): Promise<IUser | null> {
    const user = await User.findById(userId);
    if (!user) return null;

    user.savedLocations = user.savedLocations.filter(
      (loc: any) => loc._id?.toString() !== locationId && (loc as any).id?.toString() !== locationId
    );

    // If remaining locations exist and none is marked default, promote the first one
    if (user.savedLocations.length > 0 && !user.savedLocations.some((loc: any) => loc.isDefault)) {
      (user.savedLocations[0] as any).isDefault = true;
    }

    await user.save();
    return user;
  }
}
