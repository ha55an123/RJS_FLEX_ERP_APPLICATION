import { useState, useEffect } from 'react';
import { membersAPI } from '../api/gym/members';
import { branchesAPI } from '../api/gym/branches';
import { workoutsAPI } from '../api/gym/workouts';
import { dietAPI } from '../api/gym/diet';
import faceBiometricsAPI from '../api/gym/faceBiometrics';
import api from '../api/axios';
import { Plus, Search, Edit, Trash2, Fingerprint, User, Dumbbell, Apple, Eye } from 'lucide-react';
import Toast from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  branch_id: '',
  first_name: '',
  last_name: '',
  gender: 'male',
  phone: '',
  email: '',
  address: '',
  cnic: '',
  date_of_birth: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  blood_group: '',
  medical_conditions: '',
  fitness_goal: '',
  height_cm: '',
  weight_kg: '',
  joining_date: '',
  notes: '',
  profile_picture: '',
};

export default function MembersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);
  const [biometricStatuses, setBiometricStatuses] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [memberWorkout, setMemberWorkout] = useState(null);
  const [memberDiet, setMemberDiet] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, branchesRes] = await Promise.all([
        membersAPI.getAll({ page_size: 100 }),
        branchesAPI.getAll(),
      ]);
      setMembers(membersRes.data?.items || []);
      const branchList = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.items || []);
      setBranches(branchList);
      
      // Load biometric statuses for all members
      const statuses = {};
      for (const member of membersRes.data?.items || []) {
        try {
          const { data } = await faceBiometricsAPI.getStatus(member.id);
          statuses[member.id] = data;
        } catch (error) {
          statuses[member.id] = { has_biometric: false };
        }
      }
      setBiometricStatuses(statuses);
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const openAdd = () => {
    setEditingMember(null);
    const defaultBranch = branches.length === 1 ? String(branches[0].id) : '';
    setFormData({ ...EMPTY_FORM, branch_id: defaultBranch });
    setPhotoPreview(null);
    setPhotoFile(null);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setFormData({
      branch_id: String(member.branch_id || ''),
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      gender: member.gender || 'male',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      cnic: member.cnic || '',
      date_of_birth: member.date_of_birth || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || '',
      blood_group: member.blood_group || '',
      medical_conditions: member.medical_conditions || '',
      fitness_goal: member.fitness_goal || '',
      height_cm: member.height_cm != null ? String(member.height_cm) : '',
      weight_kg: member.weight_kg != null ? String(member.weight_kg) : '',
      joining_date: member.joining_date || '',
      notes: member.notes || '',
      profile_picture: member.profile_picture || '',
    });
    setPhotoPreview(member.profile_picture || null);
    setPhotoFile(null);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setPhotoPreview(null);
    setPhotoFile(null);
    setFormError('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Please select a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size must be less than 5MB');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return null;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);

      const response = await api.post('/api/v1/members/upload-photo/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.photo_url;
    } catch (error) {
      const detail = error.response?.data?.detail;
      setFormError(detail || 'Failed to upload photo');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.branch_id) {
      setFormError('Please select a branch.');
      return;
    }
    if (!formData.first_name.trim()) {
      setFormError('First name is required.');
      return;
    }
    if (!formData.last_name.trim()) {
      setFormError('Last name is required.');
      return;
    }

    // Upload photo if a new one is selected
    let photoUrl = formData.profile_picture;
    if (photoFile) {
      photoUrl = await handlePhotoUpload();
      if (!photoUrl) {
        return; // Upload failed, error already set
      }
    }

    const payload = {
      branch_id: Number(formData.branch_id),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      gender: formData.gender || null,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      cnic: formData.cnic || null,
      date_of_birth: formData.date_of_birth || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      blood_group: formData.blood_group || null,
      medical_conditions: formData.medical_conditions || null,
      fitness_goal: formData.fitness_goal || null,
      height_cm: formData.height_cm ? Number(formData.height_cm) : null,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      joining_date: formData.joining_date || null,
      notes: formData.notes || null,
      profile_picture: photoUrl || null,
    };

    setSubmitting(true);
    try {
      if (editingMember) {
        await membersAPI.update(editingMember.id, payload);
        setToast({ message: 'Member updated successfully', type: 'success' });
      } else {
        const { data } = await membersAPI.create(payload);
        setToast({
          message: `Member created successfully. Member ID: ${data.member_code}`,
          type: 'success',
        });
      }
      closeModal();
      loadData();
      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('memberDataChanged'));
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
          : 'Failed to save member. Please check all fields.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await membersAPI.delete(id);
      setToast({ message: 'Member deleted', type: 'success' });
      loadData();
      // Dispatch event to refresh dashboard
      window.dispatchEvent(new CustomEvent('memberDataChanged'));
    } catch (error) {
      setToast({ message: error.response?.data?.detail || 'Failed to delete member', type: 'error' });
    }
  };

  const handleViewPlans = async (member) => {
    setSelectedMember(member);
    setMemberWorkout(null);
    setMemberDiet(null);
    
    try {
      const [workoutRes, dietRes] = await Promise.all([
        workoutsAPI.getMemberWorkouts(member.id),
        dietAPI.getMemberDiet(member.id),
      ]);
      setMemberWorkout(workoutRes.data);
      setMemberDiet(dietRes.data);
      setShowPlanModal(true);
    } catch (error) {
      console.error('Failed to load member plans:', error);
      setToast({ message: 'Failed to load member plans', type: 'error' });
    }
  };

  const filteredMembers = members.filter((m) =>
    `${m.first_name} ${m.last_name} ${m.member_code || ''} ${m.phone || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="page-loading">Loading members...</div>;

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Members</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={20} /> Add Member
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search members by name, code, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Biometric</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => {
              const bioStatus = biometricStatuses[member.id];
              return (
                <tr key={member.id}>
                  <td>{member.member_code || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {member.profile_picture ? (
                        <img
                          src={member.profile_picture}
                          alt={member.first_name}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #e5e7eb',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <User size={16} style={{ color: '#9ca3af' }} />
                        </div>
                      )}
                      <span>{member.first_name} {member.last_name}</span>
                    </div>
                  </td>
                  <td>{member.phone || '-'}</td>
                  <td>
                    <span className={`status-badge ${
                      member.status === 'active' ? 'success' :
                      member.status === 'expired' ? 'danger' : 'warning'
                    }`}>
                      {member.status || 'pending'}
                    </span>
                  </td>
                  <td>
                    {bioStatus?.has_biometric ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Fingerprint size={14} /> Registered
                      </span>
                    ) : (
                      <span className="text-gray-400">Not registered</span>
                    )}
                  </td>
                  <td>{member.joining_date || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleViewPlans(member)} 
                        className="icon-btn" 
                        title="View Plans"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/face-registration`)} 
                        className="icon-btn" 
                        title="Register Face"
                      >
                        <Fingerprint size={16} />
                      </button>
                      <button onClick={() => openEdit(member)} className="icon-btn" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(member.id)} className="icon-btn icon-btn-danger" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredMembers.length === 0 && (
          <div className="empty-state">No members found</div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button onClick={closeModal} className="icon-btn" style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{
                    background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.35)',
                    color: '#ff6b7a', padding: '0.6rem 0.85rem', borderRadius: 8,
                    marginBottom: '1rem', fontSize: '0.85rem',
                  }}>
                    {formError}
                  </div>
                )}

                <div className="form-grid">
                  {/* Branch — required */}
                  <div className="form-group full-width">
                    <label>Branch <span style={{ color: 'var(--primary)' }}>*</span></label>
                    {branches.length === 0 ? (
                      <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                        No branches found. Please create a branch first.
                      </p>
                    ) : (
                      <select value={formData.branch_id} onChange={set('branch_id')} required>
                        <option value="">— Select Branch —</option>
                        {branches.map((b) => (
                          <option key={b.id} value={String(b.id)}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Profile Photo */}
                  <div className="form-group full-width">
                    <label>Profile Photo (Optional)</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      {photoPreview ? (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={photoPreview}
                            alt="Preview"
                            style={{
                              width: '80px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoPreview(null);
                              setPhotoFile(null);
                              setFormData({ ...formData, profile_picture: '' });
                            }}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9ca3af',
                            fontSize: '24px',
                          }}
                        >
                          <User size={32} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handlePhotoSelect}
                          disabled={uploadingPhoto}
                          style={{ fontSize: '0.85rem' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          JPG, PNG, or WEBP (max 5MB)
                        </p>
                        {uploadingPhoto && (
                          <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>
                            Uploading...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>First Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" required value={formData.first_name} onChange={set('first_name')} placeholder="e.g. Hassan" />
                  </div>
                  <div className="form-group">
                    <label>Last Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" required value={formData.last_name} onChange={set('last_name')} placeholder="e.g. Khan" />
                  </div>

                  <div className="form-group">
                    <label>Gender</label>
                    <select value={formData.gender} onChange={set('gender')}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="text" value={formData.phone} onChange={set('phone')} placeholder="e.g. 0300-1234567" />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={set('email')} placeholder="member@email.com" />
                  </div>
                  <div className="form-group">
                    <label>CNIC</label>
                    <input type="text" value={formData.cnic} onChange={set('cnic')} placeholder="35202-1234567-1" />
                  </div>

                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" value={formData.date_of_birth} onChange={set('date_of_birth')} />
                  </div>
                  <div className="form-group">
                    <label>Joining Date</label>
                    <input type="date" value={formData.joining_date} onChange={set('joining_date')} />
                  </div>

                  <div className="form-group">
                    <label>Blood Group</label>
                    <select value={formData.blood_group} onChange={set('blood_group')}>
                      <option value="">— Select —</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fitness Goal</label>
                    <input type="text" value={formData.fitness_goal} onChange={set('fitness_goal')} placeholder="e.g. Weight loss" />
                  </div>

                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input type="number" min="50" max="250" step="0.1" value={formData.height_cm} onChange={set('height_cm')} placeholder="175" />
                  </div>
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" min="20" max="300" step="0.1" value={formData.weight_kg} onChange={set('weight_kg')} placeholder="70" />
                  </div>

                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea value={formData.address} onChange={set('address')} rows={2} placeholder="Street, City" />
                  </div>

                  <div className="form-group">
                    <label>Emergency Contact Name</label>
                    <input type="text" value={formData.emergency_contact_name} onChange={set('emergency_contact_name')} placeholder="Contact person" />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Phone</label>
                    <input type="text" value={formData.emergency_contact_phone} onChange={set('emergency_contact_phone')} placeholder="0300-0000000" />
                  </div>

                  <div className="form-group full-width">
                    <label>Medical Conditions</label>
                    <textarea value={formData.medical_conditions} onChange={set('medical_conditions')} rows={2} placeholder="Any known conditions or allergies" />
                  </div>

                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea value={formData.notes} onChange={set('notes')} rows={2} placeholder="Additional notes" />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting || branches.length === 0}>
                  {submitting ? 'Saving…' : editingMember ? 'Update Member' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlanModal && selectedMember && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Member Plans - {selectedMember.first_name} {selectedMember.last_name}</h2>
              <button onClick={() => setShowPlanModal(false)} className="icon-btn" style={{ fontSize: '1.25rem', lineHeight: 1 }}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell size={20} className="text-blue-600" />
                  <h3 className="text-lg font-bold">Workout Plan</h3>
                </div>
                {memberWorkout && memberWorkout.plan ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-500">Plan Name</span>
                        <p className="font-medium">{memberWorkout.plan.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Start Date</span>
                        <p className="font-medium">{memberWorkout.assignment?.start_date || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">End Date</span>
                        <p className="font-medium">{memberWorkout.assignment?.end_date || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Goal</span>
                        <p className="font-medium capitalize">{memberWorkout.plan.goal || 'N/A'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/workouts')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Full Workout Plan →
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-500">
                    No active workout plan assigned.
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Apple size={20} className="text-green-600" />
                  <h3 className="text-lg font-bold">Diet Plan</h3>
                </div>
                {memberDiet && memberDiet.plan ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-500">Plan Name</span>
                        <p className="font-medium">{memberDiet.plan.name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Start Date</span>
                        <p className="font-medium">{memberDiet.assignment?.start_date || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Daily Calories</span>
                        <p className="font-medium">{memberDiet.plan.total_calories || 0} kcal</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Goal</span>
                        <p className="font-medium capitalize">{memberDiet.plan.goal || 'N/A'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/diet-plans')}
                      className="text-green-600 hover:text-green-800 font-medium"
                    >
                      View Full Diet Plan →
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-500">
                    No active diet plan assigned.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowPlanModal(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
