// components/DebtDetailBox.tsx
interface DebtDetailBoxProps {
    onCancel: () => void;
  }
  
  export default function DebtDetailBox({ onCancel }: DebtDetailBoxProps) {
    return (
      <div className="mt-2 bg-gray-100 border rounded shadow p-4 text-left w-full min-w-[120px]">
        <p className="text-sm mb-4">This is a placeholder</p>
        <div className="flex justify-between">
          <button className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600">
            PAY
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-300 text-black px-4 py-1 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }