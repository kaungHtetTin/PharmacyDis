export default function RepAssignmentGrid({ assignments = [] }) {
    return (
        <div className="rep-assignment-grid">
            <div className="rep-assignment-head">
                <span>Company</span>
                <span>Products</span>
                <span>Access</span>
                <span>Today</span>
                <span>Status</span>
            </div>
            {assignments.map((assignment) => (
                <div className="rep-assignment-row" key={assignment.id}>
                    <div>
                        <strong>{assignment.company}</strong>
                        <small>{assignment.region}</small>
                    </div>
                    <span>{assignment.products}</span>
                    <span>{assignment.access}</span>
                    <span>{assignment.todayOrders}</span>
                    <span className={assignment.status === 'Active' ? 'base-pill active' : 'base-pill'}>{assignment.status}</span>
                </div>
            ))}
        </div>
    );
}
