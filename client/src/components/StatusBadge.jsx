export function StatusBadge({value}){return <span className={`status status-${String(value).toLowerCase().replaceAll(' ','-').replaceAll('+','')}`}>{value}</span>}
