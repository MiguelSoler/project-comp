export default function FormInput({ label, type, value, onChange, required = false }) {
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          padding: '8px',
          width: '100%',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      />
    </div>
  );
}
