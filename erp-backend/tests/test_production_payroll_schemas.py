from app.schemas.production_payroll import (
    EmployeeTechnologyAssignmentUpdate,
    ProductionDepartmentUpdate,
    ProductionEntryUpdate,
    ProductionTechnologyUpdate,
)


def test_update_schemas_allow_partial_payloads():
    department = ProductionDepartmentUpdate()
    technology = ProductionTechnologyUpdate()
    assignment = EmployeeTechnologyAssignmentUpdate()
    entry = ProductionEntryUpdate()

    assert department.model_dump() == {"name": None, "description": None, "status": None}
    assert technology.model_dump() == {"department_id": None, "name": None, "unit_rate": None, "status": None, "description": None}
    assert assignment.model_dump() == {"employee_id": None, "technology_id": None, "assigned_date": None, "status": None, "notes": None}
    assert entry.model_dump() == {"employee_id": None, "technology_id": None, "production_date": None, "quantity": None, "remarks": None}
