import React, { useState, useEffect } from "react";
import Axios from "../Utils/Axios";
import { useParams } from "react-router-dom";

const AppModal = ({
  buttonLabel,
  dialogBoxHeader,
  tableRow,
  showButton,
  scopes,
  setIsAdded,
  isAdded,
  isRoles,
  isDeleted
}) => {
  const [showModal, setShowModal] = useState(false);
  const [checkboxData, setCheckboxData] = useState([]);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState([]);
  const { userId } = useParams();
  const resource = process.env.REACT_APP_AUTH_EXT_RESOURCE;

  const fetchData = async () => {
    try {
      const total_groups_response = await Axios(
        resource + "/groups",
        "GET",
        null,
        localStorage.getItem("auth_access_token")
      );
      const total_groups = await total_groups_response.groups;
      await Axios(
        resource + `/users/${userId}/groups`,
        "GET",
        null,
        localStorage.getItem("auth_access_token")
      ).then((response) => {
        const rem_groups = total_groups.filter(
          (item) => !response.some((obj) => obj._id === item._id)
        );
        setCheckboxData(rem_groups);
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getManagementToken = async () => {
    let managementApi = process.env.REACT_APP_MANAGEMENT_API;
    let data = {
      client_id: process.env.REACT_APP_AUTH_MANAGEMENT_CLIENT_ID,
      client_secret: process.env.REACT_APP_AUTH_MANAGEMENT_CLIENT_SECRET,
      audience: process.env.REACT_APP_AUTH_MANAGEMENT_AUDIENCE,
      grant_type: "client_credentials",
    };

    return await Axios(managementApi, "POST", data, null, true)
      .then((response) => {
        return response?.access_token;
      })
      .catch((error) => {
        console.error("error ::", error);
      });
  };

  const getClientInformation = async (
    managementToken,
    appIds,
    isUserAllRoles,
    roles
  ) => {
    const clients = process.env.REACT_APP_AUTH_GET_CLIENT;
    const promises = appIds.map((appId) => {
      return Axios(
        clients + `/${appId}?fields=client_id%2Cname`,
        "GET",
        null,
        managementToken,
        false
      );
    });
    
    const responses = await Promise.all(promises);
    const map = new Map();
    responses.forEach((response) => {
      map.set(response?.client_id, response?.name);
    });
// console.log(roles,"rrr");
    roles.map((role) => {
      role.applicationName = map.get(role.applicationId);
      return { ...role };
    });
    return roles;
  }

    const fetchRoles = async () => {
      await Axios(
        resource + `/roles`,
        "GET",
        null,
        localStorage.getItem("auth_access_token")
      )
        .then(async (response) => {
          console.log(response,"res");
          const allRoles = response.roles;
          await Axios(
            resource + `/users/${userId}/roles`,
            "GET",
            null,
            localStorage.getItem("auth_access_token")
          ).then(async (response) => {
            const remRoles = allRoles.filter(
              (item) => !response.some((obj) => obj._id === item._id)
            );
            
            let appIds = [];
            remRoles.forEach((role) => appIds.push(role.applicationId));
            await getManagementToken().then(async (tkn) => {
              await getClientInformation(tkn, appIds, null, remRoles).then(
                (response) => {
                  console.log("responsefinsl",response);
                  setCheckboxData(response);
                }
              );
            });
            // setCheckboxData(remRoles);
          });
        })
        .catch((error) => {
          console.error(
            "Error while getting assigned roles to the user :::",
            error
          );
        })
        .finally(() => { });
    };

    useEffect(() => {

      if (!isRoles) fetchData();
      if (isRoles) fetchRoles();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showModal, isAdded, isDeleted]);

    const openModal = () => {
      setShowModal(true);
    };

    const closeModal = () => {
      setSelectedCheckboxes([]);
      setShowModal(false);
    };

    const handleCheckboxChange = (checkboxId) => {
      const updatedCheckboxes = [...selectedCheckboxes];

      if (updatedCheckboxes.includes(checkboxId)) {
        updatedCheckboxes.splice(updatedCheckboxes.indexOf(checkboxId), 1);
      } else {
        updatedCheckboxes.push(checkboxId);
      }

      setSelectedCheckboxes(updatedCheckboxes);
    };

    const addUserToGroups = async () => {
      await Axios(
        resource + `/users/${userId}/groups`,
        "PATCH",
        selectedCheckboxes,
        localStorage.getItem("auth_access_token")
      )
        .then((response) => {
          setIsAdded(true);
          closeModal();
        })
        .catch((error) => {
          console.error("Error while adding a user to group", error);
        });
    };

    const addUserToRoles = async () => {
      await Axios(
        resource + `/users/${userId}/roles`,
        "PATCH",
        selectedCheckboxes,
        localStorage.getItem("auth_access_token")
      )
        .then((response) => {
          setIsAdded(true);
          closeModal();
        })
        .catch((error) => {
          console.error("Error while adding a user to role", error);
        });
    };

    const handleAdd = async () => {
      try {
        if (!isRoles) {
          await addUserToGroups();
        }

        if (isRoles) {
          await addUserToRoles();
        }
      } catch (error) {
        console.error(error);
      }
    };

    return (
      <>
        {showButton && (
          <>
            <button
              type="button"
              class="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#exampleModal"
              data-bs-whatever="@mdo"
              onClick={openModal}
            >
              + {buttonLabel}
            </button>

            <div
              class="modal fade"
              id="exampleModal"
              tabindex="-1"
              aria-labelledby="exampleModalLabel"
              aria-hidden="true"
            >
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLabel">
                      {dialogBoxHeader}
                    </h5>
                    <button
                      type="button"
                      class="btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                    ></button>
                  </div>
                  {checkboxData && checkboxData.length > 0 && (
                    <div class="modal-body">
                      <table>
                        <thead>
                          <tr>
                            {tableRow?.map((tableRow, index) => {
                              return (
                                <>
                                  <th key={index + 1}>{tableRow}</th>
                                </>
                              );
                            })}
                            {isRoles && <th>Application Name</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {checkboxData &&
                            checkboxData.map((checkbox) => (
                              <tr key={checkbox._id}>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      id={checkbox._id}
                                      style={{ marginRight: "5px" }}
                                      checked={selectedCheckboxes.includes(
                                        checkbox._id
                                      )}
                                      onChange={() =>
                                        handleCheckboxChange(checkbox._id)
                                      }
                                    />
                                    <label htmlFor={checkbox.id}>
                                      {checkbox.name}
                                    </label>
                                  </div>
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "right",
                                      marginLeft: "70px",
                                    }}
                                  >
                                    {checkbox.description}
                                  </div>
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "right",
                                      marginLeft: "70px",
                                    }}
                                  >
                                    {checkbox.applicationName}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {checkboxData?.length === 0 && (
                    <h5>No more {scopes} to add.</h5>
                  )}
                  <div class="modal-footer">
                    {checkboxData && checkboxData.length > 0 && (
                      <>
                        <button
                          type="button"
                          class="btn btn-secondary"
                          data-bs-dismiss="modal"
                          onClick={closeModal}
                        >
                          CANCEL
                        </button>
                        <button
                          type="button"
                          class="btn btn-primary"
                          onClick={handleAdd}
                        >
                          ADD
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  export default AppModal;
