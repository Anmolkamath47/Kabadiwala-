import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/layout/AppHeader';
import { BottomNav } from '../components/layout/BottomNav';
import { LogoutModal } from '../components/common/LogoutModal';
import {
  User,
  Phone,
  MapPin,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Edit2,
  Check,
  ChevronRight,
  Plus,
  Scale,
  Camera,
  Mail,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, deleteSavedAddress, setDefaultAddress, logout } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || 'Scrap Seller');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Address deletion & default management state
  const [addressToDelete, setAddressToDelete] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;
    const id = addressToDelete._id || addressToDelete.id;
    if (!id) return;

    setDeletingId(id);
    try {
      await deleteSavedAddress(id);
      setFeedbackMsg({ text: 'Address deleted successfully', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete address', err);
      setFeedbackMsg({
        text: err?.response?.data?.message || 'Failed to delete address. Please try again.',
        type: 'error',
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setDeletingId(null);
      setAddressToDelete(null);
    }
  };

  const handleSetDefault = async (locId: string) => {
    if (!locId || settingDefaultId) return;
    setSettingDefaultId(locId);
    try {
      await setDefaultAddress(locId);
      setFeedbackMsg({ text: 'Default pickup address updated', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to set default address', err);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    await updateUserProfile({ name: nameInput.trim() });
    setIsEditingName(false);
  };

  const handleSaveEmail = async () => {
    await updateUserProfile({ email: emailInput.trim() });
    setIsEditingEmail(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        await updateUserProfile({ profileImage: dataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-100 max-w-md mx-auto flex flex-col justify-between shadow-2xl pb-20">
      <AppHeader title="My Profile" showBack={false} />

      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* User Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center space-x-4">
            {/* Profile Avatar with Camera change badge */}
            <div className="relative flex-shrink-0">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user?.name || 'User'}
                  className="w-18 h-18 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'K'}
                </div>
              )}

              <label
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shadow-md border-2 border-white transition"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 border border-emerald-500 rounded-lg text-sm font-bold text-slate-900 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 truncate">
                      {user?.name || 'Scrap Seller'}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{user?.phone || '-'}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Email row */}
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                {isEditingEmail ? (
                  <div className="flex items-center space-x-1.5 w-full mt-1">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter email"
                      className="w-full px-2 py-0.5 bg-slate-50 border border-emerald-500 rounded-md text-xs text-slate-900 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEmail}
                      className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingEmail(true)}
                    className="flex items-center space-x-1 text-slate-500 hover:text-emerald-700 cursor-pointer truncate"
                  >
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{user?.email || 'Add email address'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional reset to initial letter DP if photo uploaded */}
          {user?.profileImage && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Custom photo active</span>
              <button
                type="button"
                onClick={() => updateUserProfile({ profileImage: '' })}
                className="font-bold text-rose-600 hover:underline"
              >
                Reset to Letter DP ({user?.name ? user.name.charAt(0).toUpperCase() : 'A'})
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl">
            <span className="flex items-center space-x-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Consumer Account</span>
            </span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded-md font-bold text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
        </div>

        {/* Saved Addresses Section */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Saved Pickup Addresses
            </h3>
            <button
              onClick={() => navigate('/location')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New</span>
            </button>
          </div>

          {/* Feedback message banner */}
          {feedbackMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center justify-between ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          <div className="space-y-2">
            {user?.savedLocations && user.savedLocations.length > 0 ? (
              user.savedLocations.map((loc, idx) => {
                const locId = loc._id || (loc as any).id;
                const isDeletingThis = deletingId === locId;
                const isSettingDefaultThis = settingDefaultId === locId;

                return (
                  <div
                    key={locId || idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 flex items-center justify-between transition-all group shadow-2xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{loc.label}</span>
                          {loc.isDefault ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                              Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(locId)}
                              disabled={isSettingDefaultThis}
                              className="text-[10px] text-slate-400 hover:text-emerald-700 font-medium hover:underline disabled:opacity-50"
                            >
                              {isSettingDefaultThis ? 'Updating...' : 'Set as default'}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{loc.address}</p>
                      </div>
                    </div>

                    {/* Delete action button */}
                    <button
                      type="button"
                      onClick={() => setAddressToDelete(loc)}
                      disabled={isDeletingThis}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors flex-shrink-0 disabled:opacity-50"
                      title="Delete this saved address"
                    >
                      {isDeletingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 space-y-1">
                <p>No saved pickup addresses yet.</p>
                <button
                  type="button"
                  onClick={() => navigate('/location')}
                  className="font-bold text-emerald-600 hover:underline"
                >
                  + Add your pickup location
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Informational Links */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden divide-y divide-slate-100">
          <div
            onClick={() => navigate('/location')}
            className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Manage Pickup Locations</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div
            onClick={() => navigate('/orders')}
            className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <Scale className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Scrap Pickup History</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          <div
            onClick={() => alert('Kabadiwala standard scrap recycling weights are certified by local authorities.')}
            className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Digital Weighing Guarantee</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center space-x-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>

        <div className="text-center text-[10px] text-slate-400">
          Kabadiwala Consumer App · v1.0.0
        </div>
      </main>

      {/* Delete Address Confirmation Modal */}
      {addressToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Delete Saved Address?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove this address from your saved pickup locations?
              </p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left mt-2">
                <div className="text-xs font-bold text-slate-800">{addressToDelete.label}</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{addressToDelete.address}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAddressToDelete(null)}
                disabled={deletingId !== null}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Address</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          logout();
          navigate('/login');
        }}
      />

      <BottomNav />
    </div>
  );
};
