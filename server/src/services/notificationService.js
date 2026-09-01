import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
export const notifyUser = async (userId, data) => {
  if (!userId) return null;
  const user = await User.findOne({ _id: userId, active: true }).select(
    'companyId branchId',
  );
  if (!user) return null;
  return Notification.create({
    companyId: user.companyId,
    branchId: user.branchId,
    userId: user._id,
    ...data,
  });
};
export const notifyCustomer = async (customerId, data) => {
  const users = await User.find({
    customerId,
    role: 'CUSTOMER',
    active: true,
  }).select('_id companyId branchId');
  if (!users.length) return [];
  return Notification.insertMany(
    users.map((user) => ({
      companyId: user.companyId,
      branchId: user.branchId,
      userId: user._id,
      ...data,
    })),
  );
};
