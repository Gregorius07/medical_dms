import { createSignal } from "solid-js";
import api from "../api";

export const [currentUser, setCurrentUser] = createSignal(null);
export const [isAuthLoading, setIsAuthLoading] = createSignal(true);

export const checkSession = async () =>{
    try {
        const res = await api.get('/me');
        setCurrentUser(res.data);
        console.log(res.data);
        
    } catch (error) {
        setCurrentUser(null);
    } finally{
        setIsAuthLoading(false);
    }
}