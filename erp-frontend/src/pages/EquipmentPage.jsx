import { useState, useEffect } from 'react';
import { equipmentAPI } from '../api/gym/equipment';
import { branchesAPI } from '../api/gym/branches';
import { Plus, Search, Edit, Trash2, Wrench, AlertTriangle } from 'lucide-react';

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [selectedEquipmentForMaintenance, setSelectedEquipmentForMaintenance] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: 0,
    warranty_expiry: '',
    location: '',
    status: 'operational',
    condition: 'excellent',
    branch_id: '',
  });
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    maintenance_type: 'routine',
    description: '',
    cost: 0,
    performed_by: '',
    notes: '',
  });

  useEffect(() => {
    loadEquipment();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await branchesAPI.getAll();
      // Backend returns paginated response: {items: [...]}
      setBranches(response.data?.items || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
      setBranches([]); // Set empty array on error to prevent blank page
    }
  };

  const loadEquipment = async () => {
    try {
      const response = await equipmentAPI.getAll();
      // Backend returns paginated response: { total, page, page_size, items }
      setEquipment(response.data?.items || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      setEquipment([]); // Set empty array on error to prevent blank page
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEquipment) {
        await equipmentAPI.update(editingEquipment.id, formData);
      } else {
        await equipmentAPI.create(formData);
      }
      setShowModal(false);
      setEditingEquipment(null);
      setFormData({
        name: '',
        category: '',
        brand: '',
        model: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: 0,
        warranty_expiry: '',
        location: '',
        status: 'operational',
        condition: 'excellent',
        branch_id: '',
      });
      loadEquipment();
    } catch (error) {
      console.error('Failed to save equipment:', error);
      alert('Failed to save equipment. Please try again.');
    }
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      // Backend expects technician_name, frontend sends performed_by
      const submitData = {
        ...maintenanceFormData,
        maintenance_date: new Date().toISOString().split('T')[0], // Add required maintenance_date
        technician_name: maintenanceFormData.performed_by,
      };
      await equipmentAPI.addMaintenanceLog(selectedEquipmentForMaintenance.id, submitData);
      setShowMaintenanceModal(false);
      setSelectedEquipmentForMaintenance(null);
      setMaintenanceFormData({
        maintenance_type: 'routine',
        description: '',
        cost: 0,
        performed_by: '',
        notes: '',
      });
      loadEquipment();
    } catch (error) {
      console.error('Failed to add maintenance log:', error);
      alert('Failed to add maintenance log. Please try again.');
    }
  };

  const handleEdit = (equip) => {
    setEditingEquipment(equip);
    setFormData({
      name: equip.name || '',
      category: equip.category || '',
      brand: equip.brand || '',
      model: equip.model || '',
      serial_number: equip.serial_number || '',
      purchase_date: equip.purchase_date || '',
      purchase_price: equip.purchase_price || 0,
      warranty_expiry: equip.warranty_expiry || '',
      location: equip.location || '',
      status: equip.status || 'operational',
      condition: equip.condition || 'excellent',
      branch_id: equip.branch_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        await equipmentAPI.delete(id);
        loadEquipment();
      } catch (error) {
        console.error('Failed to delete equipment:', error);
        alert('Failed to delete equipment. Please try again.');
      }
    }
  };

  const handleAddMaintenance = (equip) => {
    setSelectedEquipmentForMaintenance(equip);
    setShowMaintenanceModal(true);
  };

  const filteredEquipment = equipment.filter(e =>
    `${e.name} ${e.brand} ${e.model} ${e.serial_number || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading equipment...</div>;

  if (!loading && equipment.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Equipment</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-black font-semibold hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
          >
            <Plus size={20} />
            Add Equipment
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Wrench size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg">No equipment found</p>
          <p className="text-gray-400 text-sm mt-2">Add your first equipment to get started</p>
        </div>
        {/* Modal must be rendered here too for empty state */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Branch *</label>
                      <select
                        required
                        value={formData.branch_id}
                        onChange={(e) => setFormData({...formData, branch_id: parseInt(e.target.value)})}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select Branch</option>
                        {branches.length === 0 ? (
                          <option value="" disabled>No branches available</option>
                        ) : (
                          branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                          ))
                        )}
                      </select>
                      {branches.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          No branches available. Please create a branch first.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Category *</label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select Category</option>
                        <option value="cardio">Cardio</option>
                        <option value="strength">Strength</option>
                        <option value="free_weights">Free Weights</option>
                        <option value="flexibility">Flexibility</option>
                        <option value="functional">Functional</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Brand</label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Model</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({...formData, model: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={formData.serial_number}
                        onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Purchase Date</label>
                      <input
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Purchase Price</label>
                      <input
                        type="number"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Warranty Expiry</label>
                      <input
                        type="date"
                        value={formData.warranty_expiry}
                        onChange={(e) => setFormData({...formData, warranty_expiry: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="operational">Operational</option>
                        <option value="maintenance">Under Maintenance</option>
                        <option value="broken">Broken</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Condition</label>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData({...formData, condition: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingEquipment(null);
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-black font-semibold hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
                    >
                      {editingEquipment ? 'Update' : 'Create'} Equipment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Equipment</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-black font-semibold hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
        >
          <Plus size={20} />
          Add Equipment
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search equipment by name, brand, model, or serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand/Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEquipment.map((equip) => (
              <tr key={equip.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{equip.name}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{equip.category || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{equip.brand} {equip.model}</td>
                <td className="px-6 py-4 whitespace-nowrap">{equip.location || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    equip.status === 'operational' ? 'bg-green-100 text-green-800' :
                    equip.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    equip.status === 'broken' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {equip.status || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{equip.condition || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button onClick={() => handleAddMaintenance(equip)} className="text-orange-600 hover:text-orange-800" title="Add Maintenance">
                      <Wrench size={18} />
                    </button>
                    <button onClick={() => handleEdit(equip)} className="text-blue-600 hover:text-blue-800">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(equip.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEquipment.length === 0 && (
          <div className="text-center py-8 text-gray-500">No equipment found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Branch *</label>
                    <select
                      required
                      value={formData.branch_id}
                      onChange={(e) => setFormData({...formData, branch_id: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Branch</option>
                      {branches.length === 0 ? (
                        <option value="" disabled>No branches available</option>
                      ) : (
                        branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))
                      )}
                    </select>
                    {branches.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        No branches available. Please create a branch first.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Category</option>
                      <option value="cardio">Cardio</option>
                      <option value="strength">Strength</option>
                      <option value="free_weights">Free Weights</option>
                      <option value="flexibility">Flexibility</option>
                      <option value="functional">Functional</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Brand</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Price</label>
                    <input
                      type="number"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Warranty Expiry</label>
                    <input
                      type="date"
                      value={formData.warranty_expiry}
                      onChange={(e) => setFormData({...formData, warranty_expiry: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="operational">Operational</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="broken">Broken</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({...formData, condition: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingEquipment(null);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-black font-semibold hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
                  >
                    {editingEquipment ? 'Update' : 'Create'} Equipment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showMaintenanceModal && selectedEquipmentForMaintenance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Add Maintenance: {selectedEquipmentForMaintenance.name}
              </h2>
              <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Maintenance Type</label>
                  <select
                    value={maintenanceFormData.maintenance_type}
                    onChange={(e) => setMaintenanceFormData({...maintenanceFormData, maintenance_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="routine">Routine</option>
                    <option value="repair">Repair</option>
                    <option value="replacement">Replacement</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    required
                    value={maintenanceFormData.description}
                    onChange={(e) => setMaintenanceFormData({...maintenanceFormData, description: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost</label>
                  <input
                    type="number"
                    value={maintenanceFormData.cost}
                    onChange={(e) => setMaintenanceFormData({...maintenanceFormData, cost: parseFloat(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Performed By</label>
                  <input
                    type="text"
                    value={maintenanceFormData.performed_by}
                    onChange={(e) => setMaintenanceFormData({...maintenanceFormData, performed_by: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={maintenanceFormData.notes}
                    onChange={(e) => setMaintenanceFormData({...maintenanceFormData, notes: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMaintenanceModal(false);
                      setSelectedEquipmentForMaintenance(null);
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-black font-semibold hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                  >
                    Add Maintenance Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
