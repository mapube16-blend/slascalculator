import { forwardRef } from 'react';

const Select = forwardRef(({
  label,
  options = [],
  placeholder = 'Seleccionar...',
  value,
  onChange,
  error,
  className = '',
  ...props
}, ref) => {

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <select
        ref={ref}
        value={value}
        onChange={onChange}
        className="select w-full"
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
