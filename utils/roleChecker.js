'use strict';

/**
 * Middleware لفحص الصلاحيات للـ Express routes
 * @param {Array<String>} allowedRoles
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    const user = req.user; 

    if (!user || !user.role) {
      return res.status(403).json({ message: 'Forbidden: لا توجد صلاحية مخصصة للمستخدم' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: 'للاسف انت لا تملك صلاحية لاستخدام هذه الخدمة' });
    }

    next();
  };
}


checkRole.verify = function(user, allowedRoles) {
  if (!user || !user.role) {
    const err = new Error("Forbidden: لا توجد صلاحية مخصصة للمستخدم");
    err.status = 403;
    throw err;
  }

  if (!allowedRoles.includes(user.role)) {
    const err = new Error("للاسف انت لا تملك صلاحية لاستخدام هذه الخدمة");
    err.status = 403;
    throw err;
  }

  return true;
};


checkRole.isSuperAdmin = (user) => user?.role === 'SUPER_ADMIN';
checkRole.isAdmin      = (user) => user?.role === 'ADMIN';
checkRole.isDataEntry  = (user) => user?.role === 'DATA_ENTRY';
checkRole.isNormalUser = (user) => user?.role === 'USER';

module.exports = checkRole;
