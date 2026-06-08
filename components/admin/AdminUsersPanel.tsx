"use client";

import { useEffect, useState } from "react";
import { fetchUsers, getUsers, providerLabel, type RegisteredUser } from "@/lib/users";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);

  useEffect(() => {
    const load = async () => {
      await fetchUsers();
      setUsers(getUsers());
    };
    void load();
    window.addEventListener("users-updated", load);
    return () => window.removeEventListener("users-updated", load);
  }, []);

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Users</h1>
          <p>Registered client accounts from login and registration.</p>
        </div>
      </header>

      <section className="admin-panel glass">
        <h2>Registered Users ({users.length})</h2>
        {users.length === 0 ? (
          <p className="stock-empty-text">
            No users yet. Users appear when someone registers or logs in.
          </p>
        ) : (
          <div className="client-table-wrap">
            <table className="client-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Sign-in</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{providerLabel(u.provider)}</td>
                    <td>{new Date(u.registeredAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
