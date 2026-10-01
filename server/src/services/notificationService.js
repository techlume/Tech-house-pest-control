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
