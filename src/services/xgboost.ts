const BACKEND_URL = 'https://smart-order-hub.onrender.com';

export const xgboostService = {
    getRecommendations: async (userId: string): Promise<string[]> => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error("XGBoost service error:", error);
                return [];
            }

            const data = await response.json();
            return data.recommendations || [];
        } catch (error) {
            console.error("Error fetching recommendations from XGBoost backend:", error);
            return [];
        }
    }
};
