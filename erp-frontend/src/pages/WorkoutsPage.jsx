import { useState, useEffect } from 'react';
import { workoutsAPI } from '../api/gym/workouts';
import { membersAPI } from '../api/gym/members';
import { Plus, Search, Edit, Trash2, Dumbbell, User, Calendar, Printer, Eye, Copy } from 'lucide-react';

export default function WorkoutsPage() {
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('plans');
  const [planFormData, setPlanFormData] = useState({
    name: '',
    description: '',
    difficulty_level: 'beginner',
    duration_weeks: 4,
    sessions_per_week: 3,
  });
  const [exerciseFormData, setExerciseFormData] = useState({
    name: '',
    muscle_group: 'chest',
    equipment_required: '',
    description: '',
    instructions: '',
    difficulty_level: 'beginner',
  });
  const [assignFormData, setAssignFormData] = useState({
    member_id: '',
    workout_plan_id: '',
    start_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, exercisesRes, membersRes] = await Promise.all([
        workoutsAPI.getPlans(),
        workoutsAPI.getExercises(),
        membersAPI.getAll(),
      ]);
      setWorkoutPlans(plansRes.data || []);
      setExercises(exercisesRes.data || []);
      setMembers(membersRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await workoutsAPI.updatePlan(editingPlan.id, planFormData);
      } else {
        await workoutsAPI.createPlan(planFormData);
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      setPlanFormData({
        name: '',
        description: '',
        difficulty_level: 'beginner',
        duration_weeks: 4,
        sessions_per_week: 3,
      });
      loadData();
    } catch (error) {
      console.error('Failed to save workout plan:', error);
    }
  };

  const handleExerciseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExercise) {
        await workoutsAPI.updateExercise(editingExercise.id, exerciseFormData);
      } else {
        await workoutsAPI.createExercise(exerciseFormData);
      }
      setShowExerciseModal(false);
      setEditingExercise(null);
      setExerciseFormData({
        name: '',
        muscle_group: 'chest',
        equipment_required: '',
        description: '',
        instructions: '',
        difficulty_level: 'beginner',
      });
      loadData();
    } catch (error) {
      console.error('Failed to save exercise:', error);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await workoutsAPI.assignToMember(assignFormData.workout_plan_id, assignFormData.member_id, {
        start_date: assignFormData.start_date,
        notes: assignFormData.notes,
      });
      setShowAssignModal(false);
      setAssignFormData({
        member_id: '',
        workout_plan_id: '',
        start_date: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to assign workout:', error);
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Are you sure you want to delete this workout plan?')) {
      try {
        await workoutsAPI.deletePlan(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete plan:', error);
      }
    }
  };

  const handleDeleteExercise = async (id) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      try {
        await workoutsAPI.deleteExercise(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete exercise:', error);
      }
    }
  };

  const handleViewPlan = async (plan) => {
    try {
      const response = await workoutsAPI.getPlanById(plan.id);
      setSelectedPlan(response.data);
      setShowPlanDetailModal(true);
    } catch (error) {
      console.error('Failed to load plan details:', error);
    }
  };

  const handlePrintPlan = () => {
    if (!selectedPlan) return;
    const dayNames = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'};
    
    let exercisesHtml = '';
    if (selectedPlan.exercises && selectedPlan.exercises.length > 0) {
      const exercisesByDay = {};
      selectedPlan.exercises.forEach(ex => {
        const day = dayNames[ex.day_number] || `Day ${ex.day_number}`;
        if (!exercisesByDay[day]) exercisesByDay[day] = [];
        exercisesByDay[day].push(ex);
      });
      
      Object.entries(exercisesByDay).forEach(([day, exercises]) => {
        exercisesHtml += `
          <h3 style="margin-top: 20px; color: #1a1a2e;">${day}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Exercise</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Sets</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Reps</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Rest</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${exercises.map(ex => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${ex.exercise?.name || 'N/A'}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${ex.sets || '-'}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${ex.reps || '-'}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${ex.rest_seconds ? Math.round(ex.rest_seconds / 60) + ' min' : '-'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${ex.notes || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      });
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Workout Plan - ${selectedPlan.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1a1a2e; }
            h2 { color: #333; margin-top: 20px; }
            .info { margin: 10px 0; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>RJS FLEX GYM</h1>
          <h2>WORKOUT PLAN</h2>
          <div class="info"><span class="label">Plan:</span> ${selectedPlan.name}</div>
          <div class="info"><span class="label">Description:</span> ${selectedPlan.description || 'N/A'}</div>
          <div class="info"><span class="label">Difficulty:</span> ${selectedPlan.difficulty || 'N/A'}</div>
          <div class="info"><span class="label">Duration:</span> ${selectedPlan.duration_weeks || 0} weeks</div>
          <div class="info"><span class="label">Goal:</span> ${selectedPlan.goal || 'N/A'}</div>
          ${exercisesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleAssign = (plan) => {
    setAssignFormData({
      ...assignFormData,
      workout_plan_id: plan.id,
    });
    setShowAssignModal(true);
  };

  const filteredPlans = workoutPlans.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading workouts...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Workouts & Exercises</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExerciseModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Dumbbell size={20} />
            Add Exercise
          </button>
          <button
            onClick={() => setShowPlanModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Plan
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'plans' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Workout Plans
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'exercises' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Exercises
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {activeTab === 'plans' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    plan.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800' :
                    plan.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {plan.difficulty_level || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{plan.description || 'No description'}</p>
                <p>Duration: {plan.duration_weeks || 0} weeks</p>
                <p>Sessions/week: {plan.sessions_per_week || 0}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <button onClick={() => handleViewPlan(plan)} className="text-gray-600 hover:text-gray-800" title="View Plan">
                  <Eye size={18} />
                </button>
                <button onClick={() => handleAssign(plan)} className="text-green-600 hover:text-green-800" title="Assign to Member">
                  <User size={18} />
                </button>
                <button onClick={() => {
                  setEditingPlan(plan);
                  setPlanFormData({
                    name: plan.name || '',
                    description: plan.description || '',
                    difficulty_level: plan.difficulty_level || 'beginner',
                    duration_weeks: plan.duration_weeks || 4,
                    sessions_per_week: plan.sessions_per_week || 3,
                  });
                  setShowPlanModal(true);
                }} className="text-blue-600 hover:text-blue-800">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDeletePlan(plan.id)} className="text-red-600 hover:text-red-800">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Muscle Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExercises.map((exercise) => (
                <tr key={exercise.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{exercise.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{exercise.muscle_group || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{exercise.equipment_required || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{exercise.difficulty_level || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditingExercise(exercise);
                        setExerciseFormData({
                          name: exercise.name || '',
                          muscle_group: exercise.muscle_group || 'chest',
                          equipment_required: exercise.equipment_required || '',
                          description: exercise.description || '',
                          instructions: exercise.instructions || '',
                          difficulty_level: exercise.difficulty_level || 'beginner',
                        });
                        setShowExerciseModal(true);
                      }} className="text-blue-600 hover:text-blue-800">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteExercise(exercise.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExercises.length === 0 && (
            <div className="text-center py-8 text-gray-500">No exercises found</div>
          )}
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingPlan ? 'Edit Plan' : 'Add Workout Plan'}</h2>
              <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={planFormData.name}
                    onChange={(e) => setPlanFormData({...planFormData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty Level</label>
                  <select
                    value={planFormData.difficulty_level}
                    onChange={(e) => setPlanFormData({...planFormData, difficulty_level: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (Weeks)</label>
                    <input
                      type="number"
                      value={planFormData.duration_weeks}
                      onChange={(e) => setPlanFormData({...planFormData, duration_weeks: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sessions/Week</label>
                    <input
                      type="number"
                      value={planFormData.sessions_per_week}
                      onChange={(e) => setPlanFormData({...planFormData, sessions_per_week: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Plan</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingExercise ? 'Edit Exercise' : 'Add Exercise'}</h2>
              <form onSubmit={handleExerciseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={exerciseFormData.name}
                    onChange={(e) => setExerciseFormData({...exerciseFormData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Muscle Group</label>
                  <select
                    value={exerciseFormData.muscle_group}
                    onChange={(e) => setExerciseFormData({...exerciseFormData, muscle_group: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="chest">Chest</option>
                    <option value="back">Back</option>
                    <option value="shoulders">Shoulders</option>
                    <option value="biceps">Biceps</option>
                    <option value="triceps">Triceps</option>
                    <option value="legs">Legs</option>
                    <option value="core">Core</option>
                    <option value="cardio">Cardio</option>
                    <option value="full_body">Full Body</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Equipment Required</label>
                  <input
                    type="text"
                    value={exerciseFormData.equipment_required}
                    onChange={(e) => setExerciseFormData({...exerciseFormData, equipment_required: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={exerciseFormData.description}
                    onChange={(e) => setExerciseFormData({...exerciseFormData, description: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Instructions</label>
                  <textarea
                    value={exerciseFormData.instructions}
                    onChange={(e) => setExerciseFormData({...exerciseFormData, instructions: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty Level</label>
                  <select
                    value={exerciseFormData.difficulty_level}
                    onChange={(e) => setExerciseFormData({...exerciseFormData, difficulty_level: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowExerciseModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Exercise</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Assign Workout to Member</h2>
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Member *</label>
                  <select
                    required
                    value={assignFormData.member_id}
                    onChange={(e) => setAssignFormData({...assignFormData, member_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select Member</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.member_code} - {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={assignFormData.start_date}
                    onChange={(e) => setAssignFormData({...assignFormData, start_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={assignFormData.notes}
                    onChange={(e) => setAssignFormData({...assignFormData, notes: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Assign</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPlanDetailModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{selectedPlan.name}</h2>
                <div className="flex gap-2">
                  <button onClick={handlePrintPlan} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                    <Printer size={18} />
                    Print
                  </button>
                  <button onClick={() => setShowPlanDetailModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Close</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm text-gray-500">Difficulty</span>
                  <p className="font-medium capitalize">{selectedPlan.difficulty || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Duration</span>
                  <p className="font-medium">{selectedPlan.duration_weeks || 0} weeks</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Goal</span>
                  <p className="font-medium capitalize">{selectedPlan.goal || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Sessions/Week</span>
                  <p className="font-medium">{selectedPlan.sessions_per_week || 0}</p>
                </div>
              </div>
              
              {selectedPlan.description && (
                <div className="mb-6">
                  <span className="text-sm text-gray-500">Description</span>
                  <p className="font-medium">{selectedPlan.description}</p>
                </div>
              )}

              {selectedPlan.exercises && selectedPlan.exercises.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Weekly Schedule</h3>
                  <div className="space-y-6">
                    {(() => {
                      const dayNames = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'};
                      const exercisesByDay = {};
                      selectedPlan.exercises.forEach(ex => {
                        const day = dayNames[ex.day_number] || `Day ${ex.day_number}`;
                        if (!exercisesByDay[day]) exercisesByDay[day] = [];
                        exercisesByDay[day].push(ex);
                      });
                      
                      return Object.entries(exercisesByDay).map(([day, exercises]) => (
                        <div key={day} className="border rounded-lg p-4">
                          <h4 className="font-bold text-lg mb-3">{day}</h4>
                          {exercises.length === 0 ? (
                            <p className="text-gray-500 italic">Rest Day</p>
                          ) : (
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-3 py-2 text-left text-sm">Exercise</th>
                                  <th className="px-3 py-2 text-center text-sm">Sets</th>
                                  <th className="px-3 py-2 text-center text-sm">Reps</th>
                                  <th className="px-3 py-2 text-center text-sm">Rest</th>
                                  <th className="px-3 py-2 text-left text-sm">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {exercises.map((ex, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="px-3 py-2 font-medium">{ex.exercise?.name || 'N/A'}</td>
                                    <td className="px-3 py-2 text-center">{ex.sets || '-'}</td>
                                    <td className="px-3 py-2 text-center">{ex.reps || '-'}</td>
                                    <td className="px-3 py-2 text-center">{ex.rest_seconds ? Math.round(ex.rest_seconds / 60) + ' min' : '-'}</td>
                                    <td className="px-3 py-2 text-sm text-gray-600">{ex.notes || ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
