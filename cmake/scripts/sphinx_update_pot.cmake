# Distributed under the OSI-approved BSD 3-Clause License.
# See accompanying file LICENSE.txt for details.

cmake_minimum_required(VERSION 3.25)
get_filename_component(SCRIPT_NAME "${CMAKE_CURRENT_LIST_FILE}" NAME_WE)
set(CMAKE_MESSAGE_INDENT "[${VERSION}][${LANGUAGE}] ")
set(CMAKE_MESSAGE_INDENT_BACKUP "${CMAKE_MESSAGE_INDENT}")
message(STATUS "-------------------- ${SCRIPT_NAME} --------------------")


set(CMAKE_MODULE_PATH   "${PROJ_CMAKE_MODULES_DIR}")
set(Sphinx_ROOT_DIR     "${PROJ_CONDA_DIR}")
set(Python_ROOT_DIR     "${PROJ_CONDA_DIR}")
find_package(Git        MODULE REQUIRED)
find_package(Gettext    MODULE REQUIRED COMPONENTS Msgcat Msgmerge)
find_package(Python     MODULE REQUIRED COMPONENTS Interpreter)
find_package(Sphinx     MODULE REQUIRED COMPONENTS Build)
include(LogUtils)
include(GitUtils)
include(JsonUtils)
include(GettextUtils)


message(STATUS "Determining whether it is required to update .pot files...")
file(READ "${REFERENCES_JSON_PATH}" REFERENCES_JSON_CNT)
get_reference_of_latest_from_repo_and_current_from_json(
    IN_LOCAL_PATH                   "${PROJ_OUT_REPO_DIR}"
    IN_JSON_CNT                     "${REFERENCES_JSON_CNT}"
    IN_VERSION_TYPE                 "${VERSION_TYPE}"
    IN_BRANCH_NAME                  "${BRANCH_NAME}"
    IN_TAG_PATTERN                  "${TAG_PATTERN}"
    IN_TAG_SUFFIX                   "${TAG_SUFFIX}"
    IN_DOT_NOTATION                 ".pot"
    OUT_LATEST_OBJECT               LATEST_POT_OBJECT
    OUT_LATEST_REFERENCE            LATEST_POT_REFERENCE
    OUT_CURRENT_OBJECT              CURRENT_POT_OBJECT
    OUT_CURRENT_REFERENCE           CURRENT_POT_REFERENCE)
if (MODE_OF_UPDATE STREQUAL "COMPARE")
    if (NOT CURRENT_POT_REFERENCE STREQUAL LATEST_POT_REFERENCE)
        set(UPDATE_POT_REQUIRED     ON)
    else()
        set(UPDATE_POT_REQUIRED     OFF)
    endif()
elseif (MODE_OF_UPDATE STREQUAL "ALWAYS")
    set(UPDATE_POT_REQUIRED         ON)
elseif (MODE_OF_UPDATE STREQUAL "NEVER")
    if (NOT CURRENT_POT_REFERENCE)
        set(UPDATE_POT_REQUIRED     ON)
    else()
        set(UPDATE_POT_REQUIRED     OFF)
    endif()
else()
    message(FATAL_ERROR "Invalid MODE_OF_UPDATE value. (${MODE_OF_UPDATE})")
endif()
remove_cmake_message_indent()
message("")
message("LATEST_POT_OBJECT      = ${LATEST_POT_OBJECT}")
message("CURRENT_POT_OBJECT     = ${CURRENT_POT_OBJECT}")
message("LATEST_POT_REFERENCE   = ${LATEST_POT_REFERENCE}")
message("CURRENT_POT_REFERENCE  = ${CURRENT_POT_REFERENCE}")
message("MODE_OF_UPDATE         = ${MODE_OF_UPDATE}")
message("UPDATE_POT_REQUIRED    = ${UPDATE_POT_REQUIRED}")
message("")
restore_cmake_message_indent()


message(STATUS "Generating 'conf.py' file by configuring project(CMakeHelp)...")
if (CMAKE_HOST_LINUX)
    set(ENV_PATH                "${PROJ_CONDA_DIR}/bin:$ENV{PATH}")
    set(ENV_LD_LIBRARY_PATH     "${PROJ_CONDA_DIR}/lib:$ENV{ENV_LD_LIBRARY_PATH}")
    set(ENV_VARS_OF_SYSTEM      PATH=${ENV_PATH}
                                LD_LIBRARY_PATH=${ENV_LD_LIBRARY_PATH})
elseif (CMAKE_HOST_WIN32)
    set(ENV_PATH                "${PROJ_CONDA_DIR}/Library/bin"
                                "${PROJ_CONDA_DIR}/Scripts"
                                "${PROJ_CONDA_DIR}"
                                "$ENV{PATH}")
    string(REPLACE ";" "\\\\;" ENV_PATH "${ENV_PATH}")
    set(ENV_VARS_OF_SYSTEM      PATH=${ENV_PATH})
else()
    message(FATAL_ERROR "Invalid OS platform. (${CMAKE_HOST_SYSTEM_NAME})")
endif()
remove_cmake_message_indent()
message("")
execute_process(
    COMMAND ${CMAKE_COMMAND} -E env
            ${ENV_VARS_OF_SYSTEM}
            ${CMAKE_COMMAND}
            -S ${PROJ_OUT_REPO_UTILS_SPHINX_DIR}
            -B ${PROJ_OUT_REPO_UTILS_SPHINX_DIR}/build
            -D SPHINX_HTML=ON
    ECHO_OUTPUT_VARIABLE
    ECHO_ERROR_VARIABLE
    COMMAND_ERROR_IS_FATAL ANY)
message("")
restore_cmake_message_indent()


message(STATUS "Copying 'conf.py' file to the sphinx config directory...")
set(SRC_CONF_PY_FILE    "${PROJ_OUT_REPO_UTILS_SPHINX_DIR}/build/conf.py")
set(DST_CONF_PY_FILE    "${PROJ_OUT_REPO_DOCS_CONFIG_DIR}/conf.py")
remove_cmake_message_indent()
message("")
message("From: ${SRC_CONF_PY_FILE}")
message("To:   ${DST_CONF_PY_FILE}")
file(COPY_FILE
    "${SRC_CONF_PY_FILE}"
    "${DST_CONF_PY_FILE}")
message("")
restore_cmake_message_indent()


message(STATUS "Copying 'layout.html' file to the sphinx templates directory...")
file(MAKE_DIRECTORY "${PROJ_OUT_REPO_DOCS_TMPLS_DIR}")
file(COPY_FILE
    "${PROJ_CMAKE_TEMPLATES_DIR}/layout.html"
    "${PROJ_OUT_REPO_DOCS_TMPLS_DIR}/layout.html")
remove_cmake_message_indent()
message("")
message("From: ${PROJ_CMAKE_TEMPLATES_DIR}/layout.html")
message("To:   ${PROJ_OUT_REPO_DOCS_TMPLS_DIR}/layout.html")
message("")
restore_cmake_message_indent()


message(STATUS "Adding 'custom' into 'extensions' list in 'conf.py' file...")
set(SPHINX_CONF_PY_FILE "${PROJ_OUT_REPO_DOCS_CONFIG_DIR}/conf.py")
file(READ "${SPHINX_CONF_PY_FILE}" SPHINX_CONF_PY_CNT)
set(EXTENSIONS_LIST_REGEX "(extensions[ ]*=[ ]*[\[])([^\]]*[\]])")
string(REGEX MATCH "${EXTENSIONS_LIST_REGEX}" OLD_EXTENSIONS_LIST "${SPHINX_CONF_PY_CNT}")
if (OLD_EXTENSIONS_LIST)
    if (NOT OLD_EXTENSIONS_LIST MATCHES "'custom'")
        string(REGEX REPLACE "${EXTENSIONS_LIST_REGEX}" "\\1'custom', \\2" NEW_EXTENSIONS_LIST "${OLD_EXTENSIONS_LIST}")
        string(REGEX REPLACE "${EXTENSIONS_LIST_REGEX}" "${NEW_EXTENSIONS_LIST}" SPHINX_CONF_PY_CNT "${SPHINX_CONF_PY_CNT}")
        file(WRITE "${SPHINX_CONF_PY_FILE}" "${SPHINX_CONF_PY_CNT}")
        remove_cmake_message_indent()
        message("")
        message("Added 'custom' into 'extensions' list in 'conf.py' file.")
        message("${SPHINX_CONF_PY_FILE}")
        message("[OLD_EXTENSIONS_LIST_BEGIN]")
        message("${OLD_EXTENSIONS_LIST}")
        message("[OLD_EXTENSIONS_LIST_END]")
        message("[NEW_EXTENSIONS_LIST_BEGIN]")
        message("${NEW_EXTENSIONS_LIST}")
        message("[NEW_EXTENSIONS_LIST_END]")
        message("")
        restore_cmake_message_indent()
    else()
        remove_cmake_message_indent()
        message("")
        message("No need to add 'custom' into 'extensions' list in 'conf.py' file.")
        message("${SPHINX_CONF_PY_FILE}")
        message("[OLD_EXTENSIONS_LIST_BEGIN]")
        message("${OLD_EXTENSIONS_LIST}")
        message("[OLD_EXTENSIONS_LIST_END]")
        message("")
        restore_cmake_message_indent()
    endif()
else()
    message(FATAL_ERROR "Failed to find 'extensions' list in: ${SPHINX_CONF_PY_FILE}")
endif()


message(STATUS "Copying 'custom.py' file to the sphinx extensions directory...")
file(MAKE_DIRECTORY "${PROJ_OUT_REPO_DOCS_EXTNS_DIR}")
file(COPY_FILE
    "${PROJ_CMAKE_TEMPLATES_DIR}/custom.py"
    "${PROJ_OUT_REPO_DOCS_EXTNS_DIR}/custom.py")
remove_cmake_message_indent()
message("")
message("From:  ${PROJ_CMAKE_TEMPLATES_DIR}/custom.py")
message("To:    ${PROJ_OUT_REPO_DOCS_EXTNS_DIR}/custom.py")
message("")
restore_cmake_message_indent()


if (NOT UPDATE_POT_REQUIRED)
    message(STATUS "No need to update .pot files.")
    return()
else()
    message(STATUS "Prepare to update .pot files.")
endif()


message(STATUS "Removing '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/' directory...")
if (EXISTS "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}")
    file(REMOVE_RECURSE "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}")
    remove_cmake_message_indent()
    message("")
    message("Directory '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/' exists.")
    message("Removed '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/'.")
    message("")
    restore_cmake_message_indent()
else()
    remove_cmake_message_indent()
    message("")
    message("Directory '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/' does NOT exist.")
    message("No need to remove '${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/'.")
    message("")
    restore_cmake_message_indent()
endif()


message(STATUS "Running 'sphinx-build' command with 'gettext' builder to generate .pot files...")
if (CMAKE_HOST_LINUX)
    set(ENV_PATH                "${PROJ_CONDA_DIR}/bin:$ENV{PATH}")
    set(ENV_LD_LIBRARY_PATH     "${PROJ_CONDA_DIR}/lib:$ENV{ENV_LD_LIBRARY_PATH}")
    set(ENV_PYTHONPATH          "${PROJ_OUT_REPO_DOCS_EXTNS_DIR}")
    set(ENV_VARS_OF_SYSTEM      PATH=${ENV_PATH}
                                LD_LIBRARY_PATH=${ENV_LD_LIBRARY_PATH}
                                PYTHONPATH=${ENV_PYTHONPATH})
elseif (CMAKE_HOST_WIN32)
    set(ENV_PATH                "${PROJ_CONDA_DIR}/Library/bin"
                                "${PROJ_CONDA_DIR}/Scripts"
                                "${PROJ_CONDA_DIR}"
                                "$ENV{PATH}")
    set(ENV_PYTHONPATH          "${PROJ_OUT_REPO_DOCS_EXTNS_DIR}")
    string(REPLACE ";" "\\\\;" ENV_PATH "${ENV_PATH}")
    string(REPLACE ";" "\\\\;" ENV_PYTHONPATH "${ENV_PYTHONPATH}")
    set(ENV_VARS_OF_SYSTEM      PATH=${ENV_PATH}
                                PYTHONPATH=${ENV_PYTHONPATH})
else()
    message(FATAL_ERROR "Invalid OS platform. (${CMAKE_HOST_SYSTEM_NAME})")
endif()
remove_cmake_message_indent()
message("")
execute_process(
    COMMAND ${CMAKE_COMMAND} -E env
            ${ENV_VARS_OF_SYSTEM}
            ${Sphinx_BUILD_EXECUTABLE}
            -b gettext
            -D version=${VERSION}                               # Specify 'Project-Id-Version' in .pot files.
            -D templates_path=${TMPLS_TO_SOURCE_DIR}            # Relative to <sourcedir>.
            -D gettext_compact=${GETTEXT_COMPACT}
            -D gettext_additional_targets=${GETTEXT_ADDITIONAL_TARGETS}
            -j ${SPHINX_JOB_NUMBER}
            ${SPHINX_VERBOSE_ARGS}
            -c ${PROJ_OUT_REPO_DOCS_CONFIG_DIR}                 # <configdir>, where conf.py locates.
            ${PROJ_OUT_REPO_DOCS_SOURCE_DIR}                    # <sourcedir>, where index.rst locates.
            ${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/pot/LC_MESSAGES    # <outputdir>, where .pot generates.
    WORKING_DIRECTORY ${PROJ_OUT_REPO_DOCS_DIR}
    ECHO_OUTPUT_VARIABLE
    ECHO_ERROR_VARIABLE
    RESULT_VARIABLE RES_VAR
    OUTPUT_VARIABLE OUT_VAR OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_VARIABLE  ERR_VAR ERROR_STRIP_TRAILING_WHITESPACE)
if (RES_VAR EQUAL 0)
    if (ERR_VAR)
        string(APPEND WARNING_REASON
        "The command succeeded with warnings.\n\n"
        "    result:\n\n${RES_VAR}\n\n"
        "    stderr:\n\n${ERR_VAR}")
        message("${WARNING_REASON}")
    endif()
else()
    string(APPEND FAILURE_REASON
    "The command failed with fatal errors.\n\n"
    "    result:\n\n${RES_VAR}\n\n"
    "    stderr:\n\n${ERR_VAR}")
    message(FATAL_ERROR "${FAILURE_REASON}")
endif()
message("")
restore_cmake_message_indent()


message(STATUS "Running 'msgcat' command to update 'sphinx.pot' file...")
execute_process(
    COMMAND ${Python_EXECUTABLE} -c "import sphinx; print(sphinx.__file__);"
    RESULT_VARIABLE RES_VAR
    OUTPUT_VARIABLE OUT_VAR OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_VARIABLE  ERR_VAR ERROR_STRIP_TRAILING_WHITESPACE)
if (RES_VAR EQUAL 0)
    get_filename_component(SPHINX_LIB_DIR "${OUT_VAR}" DIRECTORY)
else()
    string(APPEND FAILURE_REASON
    "The command failed with fatal errors.\n\n"
    "    result:\n\n${RES_VAR}\n\n"
    "    stdout:\n\n${OUT_VAR}\n\n"
    "    stderr:\n\n${ERR_VAR}")
    message(FATAL_ERROR "${FAILURE_REASON}")
endif()
set(DEFAULT_SPHINX_POT_FILE "${SPHINX_LIB_DIR}/locale/sphinx.pot")
set(PACKAGE_SPHINX_POT_FILE "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/pot/LC_MESSAGES/sphinx.pot")
remove_cmake_message_indent()
message("")
message("From: ${DEFAULT_SPHINX_POT_FILE}")
message("To:   ${PACKAGE_SPHINX_POT_FILE}")
message("")
update_sphinx_pot_from_def_to_pkg(
    IN_DEF_FILE     "${DEFAULT_SPHINX_POT_FILE}"
    IN_PKG_FILE     "${PACKAGE_SPHINX_POT_FILE}"
    IN_WRAP_WIDTH   "${GETTEXT_WRAP_WIDTH}")
message("")
restore_cmake_message_indent()


message(STATUS "Running 'msgmerge/msgcat' command to update .pot files...")
set(SRC_POT_DIR "${PROJ_OUT_REPO_DOCS_LOCALE_DIR}/pot")
set(DST_POT_DIR "${PROJ_L10N_VERSION_LOCALE_DIR}/pot")
remove_cmake_message_indent()
message("")
message("From: ${SRC_POT_DIR}/")
message("To:   ${DST_POT_DIR}/")
message("")
update_pot_from_src_to_dst(
    IN_SRC_DIR      "${SRC_POT_DIR}"
    IN_DST_DIR      "${DST_POT_DIR}"
    IN_WRAP_WIDTH   "${GETTEXT_WRAP_WIDTH}")
message("")
restore_cmake_message_indent()


set_json_value_by_dot_notation(
    IN_JSON_OBJECT      "${REFERENCES_JSON_CNT}"
    IN_DOT_NOTATION     ".pot"
    IN_JSON_VALUE       "${LATEST_POT_OBJECT}"
    OUT_JSON_OBJECT     REFERENCES_JSON_CNT)


file(WRITE "${REFERENCES_JSON_PATH}" "${REFERENCES_JSON_CNT}")
