// components/SharesList.tsx
interface ShareItem {
    name: string;
    description: string;
    amount: number;
  }
  
  interface SharesListProps {
    data: ShareItem[];
  }
  
  export default function SharesList({ data }: SharesListProps) {
    return (
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center space-x-4 p-3 bg-white border rounded shadow"
          >
            {/* Profile Icon Placeholder */}
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
              👤
            </div>
  
            {/* Info */}
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{item.name}</div>
              <div className="text-sm text-gray-500">{item.description}</div>
            </div>
  
            {/* Amount */}
            <div className="text-red-500 font-semibold">{item.amount}€</div>
          </div>
        ))}
      </div>
    );
  }