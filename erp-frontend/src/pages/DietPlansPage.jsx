import { useState, useEffect } from 'react';
import { dietAPI } from '../api/gym/diet';
import { membersAPI } from '../api/gym/members';
import { Plus, Search, Edit, Trash2, Apple, User, Calendar, Printer, Eye } from 'lucide-react';

export default function DietPlansPage() {
  const [dietPlans, setDietPlans] = useState([]);
  const [meals, setMeals] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('plans');
  const [planFormData, setPlanFormData] = useState({
    name: '',
    description: '',
    diet_type: 'balanced',
    daily_calories: 2000,
    protein_grams: 150,
    carbs_grams: 200,
    fats_grams: 70,
    duration_weeks: 4,
  });
  const [mealFormData, setMealFormData] = useState({
    name: '',
    meal_type: 'breakfast',
    description: '',
    ingredients: '',
    instructions: '',
    calories: 0,
    protein_grams: 0,
    carbs_grams: 0,
    fats_grams: 0,
  });
  const [assignFormData, setAssignFormData] = useState({
    member_id: '',
    diet_plan_id: '',
    start_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, mealsRes, membersRes] = await Promise.all([
        dietAPI.getPlans(),
        dietAPI.getMeals(),
        membersAPI.getAll(),
      ]);
      setDietPlans(plansRes.data || []);
      setMeals(mealsRes.data || []);
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
        await dietAPI.updatePlan(editingPlan.id, planFormData);
      } else {
        await dietAPI.createPlan(planFormData);
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      setPlanFormData({
        name: '',
        description: '',
        diet_type: 'balanced',
        daily_calories: 2000,
        protein_grams: 150,
        carbs_grams: 200,
        fats_grams: 70,
        duration_weeks: 4,
      });
      loadData();
    } catch (error) {
      console.error('Failed to save diet plan:', error);
    }
  };

  const handleMealSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMeal) {
        await dietAPI.updateMeal(editingMeal.id, mealFormData);
      } else {
        await dietAPI.createMeal(mealFormData);
      }
      setShowMealModal(false);
      setEditingMeal(null);
      setMealFormData({
        name: '',
        meal_type: 'breakfast',
        description: '',
        ingredients: '',
        instructions: '',
        calories: 0,
        protein_grams: 0,
        carbs_grams: 0,
        fats_grams: 0,
      });
      loadData();
    } catch (error) {
      console.error('Failed to save meal:', error);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await dietAPI.assignToMember(assignFormData.diet_plan_id, assignFormData.member_id, {
        start_date: assignFormData.start_date,
        notes: assignFormData.notes,
      });
      setShowAssignModal(false);
      setAssignFormData({
        member_id: '',
        diet_plan_id: '',
        start_date: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to assign diet:', error);
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Are you sure you want to delete this diet plan?')) {
      try {
        await dietAPI.deletePlan(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete plan:', error);
      }
    }
  };

  const handleDeleteMeal = async (id) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        await dietAPI.deleteMeal(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete meal:', error);
      }
    }
  };

  const handleViewPlan = async (plan) => {
    try {
      const response = await dietAPI.getPlanById(plan.id);
      setSelectedPlan(response.data);
      setShowPlanDetailModal(true);
    } catch (error) {
      console.error('Failed to load plan details:', error);
    }
  };

  const handlePrintPlan = () => {
    if (!selectedPlan) return;
    
    let mealsHtml = '';
    if (selectedPlan.items && selectedPlan.items.length > 0) {
      const itemsByMealType = {};
      selectedPlan.items.forEach(item => {
        const mealType = item.meal_type;
        if (!itemsByMealType[mealType]) itemsByMealType[mealType] = [];
        itemsByMealType[mealType].push(item);
      });
      
      Object.entries(itemsByMealType).forEach(([mealType, items]) => {
        mealsHtml += `
          <h3 style="margin-top: 20px; color: #1a1a2e; text-transform: capitalize;">${mealType.replace('_', ' ')}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Food Item</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Quantity</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Calories</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Protein</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Carbs</th>
                <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Fat</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.food_name || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity || '-'}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${item.calories || 0} kcal</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${item.protein_g || 0}g</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${item.carbs_g || 0}g</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${item.fat_g || 0}g</td>
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
          <title>Diet Plan - ${selectedPlan.name}</title>
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
          <h2>DIET PLAN</h2>
          <div class="info"><span class="label">Plan:</span> ${selectedPlan.name}</div>
          <div class="info"><span class="label">Description:</span> ${selectedPlan.description || 'N/A'}</div>
          <div class="info"><span class="label">Goal:</span> ${selectedPlan.goal || 'N/A'}</div>
          <div class="info"><span class="label">Daily Calories:</span> ${selectedPlan.total_calories || 0} kcal</div>
          <div class="info"><span class="label">Macros:</span> Protein: ${selectedPlan.protein_g || 0}g | Carbs: ${selectedPlan.carbs_g || 0}g | Fat: ${selectedPlan.fat_g || 0}g</div>
          <div class="info"><span class="label">Water:</span> ${selectedPlan.water_liters || 0} liters/day</div>
          ${mealsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleAssign = (plan) => {
    setAssignFormData({
      ...assignFormData,
      diet_plan_id: plan.id,
    });
    setShowAssignModal(true);
  };

  const filteredPlans = dietPlans.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMeals = meals.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-6">Loading diet plans...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Diet Plans & Meals</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMealModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Apple size={20} />
            Add Meal
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
            Diet Plans
          </button>
          <button
            onClick={() => setActiveTab('meals')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'meals' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Meals
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
                  <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                    plan.diet_type === 'vegetarian' ? 'bg-green-100 text-green-800' :
                    plan.diet_type === 'vegan' ? 'bg-emerald-100 text-emerald-800' :
                    plan.diet_type === 'keto' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {plan.diet_type || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{plan.description || 'No description'}</p>
                <p>Calories: {plan.daily_calories || 0} kcal/day</p>
                <p>Duration: {plan.duration_weeks || 0} weeks</p>
                <p>Macro: P:{plan.protein_grams || 0}g C:{plan.carbs_grams || 0}g F:{plan.fats_grams || 0}g</p>
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
                    diet_type: plan.diet_type || 'balanced',
                    daily_calories: plan.daily_calories || 2000,
                    protein_grams: plan.protein_grams || 150,
                    carbs_grams: plan.carbs_grams || 200,
                    fats_grams: plan.fats_grams || 70,
                    duration_weeks: plan.duration_weeks || 4,
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meal Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protein</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMeals.map((meal) => (
                <tr key={meal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{meal.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{meal.meal_type || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{meal.calories || 0} kcal</td>
                  <td className="px-6 py-4 whitespace-nowrap">{meal.protein_grams || 0}g</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditingMeal(meal);
                        setMealFormData({
                          name: meal.name || '',
                          meal_type: meal.meal_type || 'breakfast',
                          description: meal.description || '',
                          ingredients: meal.ingredients || '',
                          instructions: meal.instructions || '',
                          calories: meal.calories || 0,
                          protein_grams: meal.protein_grams || 0,
                          carbs_grams: meal.carbs_grams || 0,
                          fats_grams: meal.fats_grams || 0,
                        });
                        setShowMealModal(true);
                      }} className="text-blue-600 hover:text-blue-800">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteMeal(meal.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMeals.length === 0 && (
            <div className="text-center py-8 text-gray-500">No meals found</div>
          )}
        </div>
      )}

      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingPlan ? 'Edit Plan' : 'Add Diet Plan'}</h2>
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
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Diet Type</label>
                  <select
                    value={planFormData.diet_type}
                    onChange={(e) => setPlanFormData({...planFormData, diet_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="keto">Keto</option>
                    <option value="paleo">Paleo</option>
                    <option value="low_carb">Low Carb</option>
                    <option value="high_protein">High Protein</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Daily Calories</label>
                    <input
                      type="number"
                      value={planFormData.daily_calories}
                      onChange={(e) => setPlanFormData({...planFormData, daily_calories: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
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
                    <label className="block text-sm font-medium mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={planFormData.protein_grams}
                      onChange={(e) => setPlanFormData({...planFormData, protein_grams: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={planFormData.carbs_grams}
                      onChange={(e) => setPlanFormData({...planFormData, carbs_grams: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Fats (g)</label>
                    <input
                      type="number"
                      value={planFormData.fats_grams}
                      onChange={(e) => setPlanFormData({...planFormData, fats_grams: parseInt(e.target.value)})}
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

      {showMealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingMeal ? 'Edit Meal' : 'Add Meal'}</h2>
              <form onSubmit={handleMealSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={mealFormData.name}
                    onChange={(e) => setMealFormData({...mealFormData, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meal Type</label>
                  <select
                    value={mealFormData.meal_type}
                    onChange={(e) => setMealFormData({...mealFormData, meal_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="pre_workout">Pre-Workout</option>
                    <option value="post_workout">Post-Workout</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={mealFormData.description}
                    onChange={(e) => setMealFormData({...mealFormData, description: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ingredients</label>
                  <textarea
                    value={mealFormData.ingredients}
                    onChange={(e) => setMealFormData({...mealFormData, ingredients: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Instructions</label>
                  <textarea
                    value={mealFormData.instructions}
                    onChange={(e) => setMealFormData({...mealFormData, instructions: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Calories</label>
                    <input
                      type="number"
                      value={mealFormData.calories}
                      onChange={(e) => setMealFormData({...mealFormData, calories: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={mealFormData.protein_grams}
                      onChange={(e) => setMealFormData({...mealFormData, protein_grams: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={mealFormData.carbs_grams}
                      onChange={(e) => setMealFormData({...mealFormData, carbs_grams: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fats (g)</label>
                    <input
                      type="number"
                      value={mealFormData.fats_grams}
                      onChange={(e) => setMealFormData({...mealFormData, fats_grams: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowMealModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Meal</button>
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
              <h2 className="text-2xl font-bold mb-4">Assign Diet to Member</h2>
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
                  <span className="text-sm text-gray-500">Goal</span>
                  <p className="font-medium capitalize">{selectedPlan.goal || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Daily Calories</span>
                  <p className="font-medium">{selectedPlan.total_calories || 0} kcal</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Protein</span>
                  <p className="font-medium">{selectedPlan.protein_g || 0}g</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Carbohydrates</span>
                  <p className="font-medium">{selectedPlan.carbs_g || 0}g</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Fat</span>
                  <p className="font-medium">{selectedPlan.fat_g || 0}g</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Water</span>
                  <p className="font-medium">{selectedPlan.water_liters || 0} liters/day</p>
                </div>
              </div>
              
              {selectedPlan.description && (
                <div className="mb-6">
                  <span className="text-sm text-gray-500">Description</span>
                  <p className="font-medium">{selectedPlan.description}</p>
                </div>
              )}

              {selectedPlan.items && selectedPlan.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Daily Meal Schedule</h3>
                  <div className="space-y-6">
                    {(() => {
                      const itemsByMealType = {};
                      selectedPlan.items.forEach(item => {
                        const mealType = item.meal_type;
                        if (!itemsByMealType[mealType]) itemsByMealType[mealType] = [];
                        itemsByMealType[mealType].push(item);
                      });
                      
                      return Object.entries(itemsByMealType).map(([mealType, items]) => (
                        <div key={mealType} className="border rounded-lg p-4">
                          <h4 className="font-bold text-lg mb-3 capitalize">{mealType.replace('_', ' ')}</h4>
                          {items.length === 0 ? (
                            <p className="text-gray-500 italic">No meals scheduled</p>
                          ) : (
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-3 py-2 text-left text-sm">Food Item</th>
                                  <th className="px-3 py-2 text-left text-sm">Quantity</th>
                                  <th className="px-3 py-2 text-center text-sm">Calories</th>
                                  <th className="px-3 py-2 text-center text-sm">Protein</th>
                                  <th className="px-3 py-2 text-center text-sm">Carbs</th>
                                  <th className="px-3 py-2 text-center text-sm">Fat</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="px-3 py-2 font-medium">{item.food_name || 'N/A'}</td>
                                    <td className="px-3 py-2">{item.quantity || '-'}</td>
                                    <td className="px-3 py-2 text-center">{item.calories || 0} kcal</td>
                                    <td className="px-3 py-2 text-center">{item.protein_g || 0}g</td>
                                    <td className="px-3 py-2 text-center">{item.carbs_g || 0}g</td>
                                    <td className="px-3 py-2 text-center">{item.fat_g || 0}g</td>
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
